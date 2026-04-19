"""AI 분석·챗봇 라우터 — contracts/ai.md 기준."""
import json
import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.schemas.analysis import AnalyzeRequest, ChatRequest, ComparisonRequest
from app.services import claude, cache as cache_svc, indicators as ind_svc
from app.services import usage as usage_svc
from app.services.score_parser import parse_scores
from app.services.auth import get_current_user_optional
from app.models.user import User
from app.config import get_settings

router = APIRouter(prefix="/api/v1/ai", tags=["AI 분석"])
logger = logging.getLogger(__name__)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

DISCLAIMER = "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다."

ANALYSIS_DAILY_LIMIT = 3
COMPARISON_DAILY_LIMIT = 10


@router.post("/analyze")
@limiter.limit(f"{settings.ai_rate_limit_per_minute}/minute")
async def analyze(
    request: Request,
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """AI 기술적 분석 리포트 SSE 스트리밍."""

    async def generate():
        # 1. 로그인 사용자 일일 사용량 체크 (관리자 제외)
        is_admin = current_user and (
            current_user.is_admin or current_user.email in settings.admin_emails_list
        )
        if current_user and not is_admin:
            allowed = await usage_svc.check_and_increment_analysis(
                db, current_user.id, req.ticker, req.market, limit=ANALYSIS_DAILY_LIMIT
            )
            if not allowed:
                yield f"data: {json.dumps({'type': 'error', 'text': f'오늘 {req.ticker.upper()} 분석 횟수({ANALYSIS_DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해 주세요.'}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

        # 2. 유효 캐시 확인
        cached = None
        try:
            cached = await cache_svc.get_valid_cache(db, req.ticker, req.market)
        except Exception as cache_err:
            logger.warning("캐시 조회 실패 (무시하고 계속): %s", cache_err)
        if cached:
            cached_at = cached.created_at.isoformat()
            yield f"data: {json.dumps({'type': 'cached', 'cached_at': cached_at}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'text', 'text': cached.analysis_text}, ensure_ascii=False)}\n\n"
            if cached.buy_score_short is not None:
                score_data = {
                    "type": "score",
                    "score": {
                        "short_term": {"period": "1주", "score": cached.buy_score_short, "label": cached.buy_score_short_label},
                        "mid_term": {"period": "3개월", "score": cached.buy_score_mid, "label": cached.buy_score_mid_label},
                        "long_term": {"period": "1년", "score": cached.buy_score_long, "label": cached.buy_score_long_label},
                    },
                }
                yield f"data: {json.dumps(score_data, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'disclaimer', 'disclaimer': DISCLAIMER}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 3. 기술 지표 계산
        try:
            snapshot = await ind_svc.get_indicators_snapshot(req.ticker, req.market)
        except ValueError as e:
            yield f"data: {json.dumps({'type': 'text', 'text': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 4. Claude 스트리밍
        full_text = ""
        has_error = False
        # 4-a. 시장 이슈 캐시 조회 (1시간 이내, 없으면 None으로 진행)
        market_issues_text: str | None = None
        try:
            from app.models.market_issues_cache import MarketIssuesCache
            cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
            issues_result = await db.execute(
                select(MarketIssuesCache)
                .where(MarketIssuesCache.created_at >= cutoff)
                .order_by(desc(MarketIssuesCache.created_at))
                .limit(1)
            )
            cached_issues = issues_result.scalar_one_or_none()
            if cached_issues:
                market_issues_text = cached_issues.issues_text
        except Exception as mie:
            logger.warning("시장 이슈 캐시 조회 실패 (무시): %s", mie)

        async for chunk in claude.stream_analysis(req.ticker, req.market, snapshot, market_issues=market_issues_text):
            try:
                event = json.loads(chunk[6:])
                if event.get("type") == "text":
                    full_text += event.get("text", "")
                    yield chunk
                elif event.get("type") == "error":
                    has_error = True
                    yield f"data: {json.dumps({'type': 'text', 'text': event.get('text', '')}, ensure_ascii=False)}\n\n"
                else:
                    yield chunk
            except Exception:
                yield chunk

        # 5. 에러 없이 완료 시: score 이벤트 전송 + 캐시 저장 + 기록 저장
        if not has_error:
            scores = parse_scores(full_text)
            if scores:
                score_event = {"type": "score", "score": scores}
                yield f"data: {json.dumps(score_event, ensure_ascii=False)}\n\n"

                for _ in range(2):
                    try:
                        await cache_svc.save_cache(
                            db, req.ticker, req.market, full_text, snapshot, scores
                        )
                        break
                    except Exception as e:
                        logger.warning("캐시 저장 실패: %s", e)

                                # 분석 기록 저장 — UPSERT (로그인 사용자만)
                if current_user:
                    try:
                        from app.models.analysis_history import AnalysisHistory
                        from app.services.usage import today_kst
                        _KST = ZoneInfo("Asia/Seoul")
                        today_start = datetime.combine(
                            today_kst(), datetime.min.time()
                        ).replace(tzinfo=_KST)
                        ex_res = await db.execute(
                            select(AnalysisHistory)
                            .where(
                                AnalysisHistory.user_id == current_user.id,
                                AnalysisHistory.ticker == req.ticker.upper(),
                                AnalysisHistory.market == req.market,
                                AnalysisHistory.created_at >= today_start,
                            )
                            .order_by(desc(AnalysisHistory.created_at))
                            .limit(1)
                            .with_for_update(skip_locked=True)
                        )
                        existing = ex_res.scalar_one_or_none()
                        if existing:
                            existing.analysis_text = full_text
                            existing.buy_score_short = scores.get("short_term", {}).get("score")
                            existing.buy_score_short_label = scores.get("short_term", {}).get("label")
                            existing.buy_score_mid = scores.get("mid_term", {}).get("score")
                            existing.buy_score_mid_label = scores.get("mid_term", {}).get("label")
                            existing.buy_score_long = scores.get("long_term", {}).get("score")
                            existing.buy_score_long_label = scores.get("long_term", {}).get("label")
                            existing.created_at = datetime.now(timezone.utc)
                        else:
                            history = AnalysisHistory(
                                user_id=current_user.id,
                                ticker=req.ticker.upper(),
                                market=req.market,
                                analysis_text=full_text,
                                buy_score_short=scores.get("short_term", {}).get("score"),
                                buy_score_short_label=scores.get("short_term", {}).get("label"),
                                buy_score_mid=scores.get("mid_term", {}).get("score"),
                                buy_score_mid_label=scores.get("mid_term", {}).get("label"),
                                buy_score_long=scores.get("long_term", {}).get("score"),
                                buy_score_long_label=scores.get("long_term", {}).get("label"),
                            )
                            db.add(history)
                        await db.commit()
                        yield f"data: {json.dumps({'type': 'saved'}, ensure_ascii=False)}\n\n"
                    except Exception as e:
                        logger.warning("분석 기록 저장 실패: %s", e)
                        yield f"data: {json.dumps({'type': 'save_error'}, ensure_ascii=False)}\n\n"

        # 6. 면책 고지 + 스트림 종료
        yield f"data: {json.dumps({'type': 'disclaimer', 'disclaimer': DISCLAIMER}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/comparison")
@limiter.limit("20/minute")
async def comparison(
    request: Request,
    req: ComparisonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """다중 종목 비교 분석 SSE 스트리밍."""

    async def generate():
        # 로그인 사용자 일일 사용량 체크
        if current_user:
            allowed = await usage_svc.check_and_increment_daily(
                db, current_user.id, "comparison", limit=COMPARISON_DAILY_LIMIT
            )
            if not allowed:
                yield f"data: {json.dumps({'type': 'error', 'text': f'오늘 비교 분석 횟수({COMPARISON_DAILY_LIMIT}회)를 초과했습니다.'}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

        # 각 종목 기술 지표 수집
        tickers_data = []
        for ticker in req.tickers:
            try:
                snapshot = await ind_svc.get_indicators_snapshot(ticker, req.market)
                tickers_data.append({"ticker": ticker, "market": req.market, "indicators": snapshot})
            except ValueError as e:
                yield f"data: {json.dumps({'type': 'error', 'text': f'{ticker}: {e}'}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

        # Claude 비교 분석 스트리밍
        full_text = ""
        has_error = False
        async for chunk in claude.stream_comparison(tickers_data):
            try:
                event = json.loads(chunk[6:])
                if event.get("type") == "text":
                    full_text += event.get("text", "")
                elif event.get("type") == "error":
                    has_error = True
            except Exception:
                pass
            yield chunk

        # 비교 분석 기록 저장 (로그인 사용자만)
        if not has_error and full_text and current_user:
            try:
                from app.models.analysis_history import AnalysisHistory
                history = AnalysisHistory(
                    user_id=current_user.id,
                    ticker=req.tickers[0].upper(),
                    market=req.market,
                    analysis_text=full_text,
                    analysis_type="comparison",
                    tickers_json=json.dumps(req.tickers, ensure_ascii=False),
                )
                db.add(history)
                await db.commit()
                yield f"data: {json.dumps({'type': 'saved'}, ensure_ascii=False)}\n\n"
            except Exception as e:
                logger.warning("비교 분석 기록 저장 실패: %s", e)
                yield f"data: {json.dumps({'type': 'save_error'}, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'type': 'disclaimer', 'disclaimer': DISCLAIMER}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/chat")
@limiter.limit("10/minute")
async def chat(
    request: Request,
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI 챗봇 질의응답 SSE 스트리밍."""
    from app.models.chat_message import ChatMessage

    async def generate():
        snapshot = None
        if req.ticker and req.market:
            try:
                snapshot = await ind_svc.get_indicators_snapshot(req.ticker, req.market)
            except Exception:
                pass

        msg = ChatMessage(question=req.message, ticker=req.ticker, market=req.market)
        db.add(msg)
        await db.commit()
        await db.refresh(msg)

        full_answer = ""
        async for chunk in claude.stream_chat(req.ticker, req.market, req.message, snapshot):
            yield chunk
            if chunk.startswith("data: ") and "[DONE]" not in chunk:
                try:
                    event = json.loads(chunk[6:])
                    if event.get("type") == "text":
                        full_answer += event.get("text", "")
                except Exception:
                    pass

        msg.answer = full_answer
        await db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")
