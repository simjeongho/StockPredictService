"""AI 분석·챗봇 라우터 — contracts/ai.md 기준."""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.schemas.analysis import AnalyzeRequest, ChatRequest
from app.services import claude, cache as cache_svc, indicators as ind_svc
from app.services.score_parser import parse_scores
from app.config import get_settings

router = APIRouter(prefix="/api/v1/ai", tags=["AI 분석"])
logger = logging.getLogger(__name__)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

DISCLAIMER = "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다."


@router.post("/analyze")
@limiter.limit(f"{settings.ai_rate_limit_per_minute}/minute")
async def analyze(
    request: Request,
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI 기술적 분석 리포트 SSE 스트리밍."""

    async def generate():
        # 1. 유효 캐시 확인
        cached = await cache_svc.get_valid_cache(db, req.ticker, req.market)
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

        # 2. 기술 지표 계산
        try:
            snapshot = await ind_svc.get_indicators_snapshot(req.ticker, req.market)
        except ValueError as e:
            yield f"data: {json.dumps({'type': 'text', 'text': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 3. Claude 스트리밍 + 전체 텍스트 수집
        full_text = ""
        async for chunk in claude.stream_analysis(req.ticker, req.market, snapshot):
            yield chunk
            # 텍스트 청크 수집
            if chunk.startswith("data: ") and "[DONE]" not in chunk:
                try:
                    event = json.loads(chunk[6:])
                    if event.get("type") == "text":
                        full_text += event.get("text", "")
                except Exception:
                    pass

        # 4. buy_score 파싱 + score 이벤트 전송
        scores = parse_scores(full_text)
        if scores:
            score_event = {"type": "score", "score": scores}
            yield f"data: {json.dumps(score_event, ensure_ascii=False)}\n\n"

        # 5. 캐시 저장 (재시도 2회)
        for _ in range(2):
            try:
                await cache_svc.save_cache(
                    db, req.ticker, req.market, full_text, snapshot, scores
                )
                break
            except Exception as e:
                logger.warning("캐시 저장 실패: %s", e)

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
        # 종목 컨텍스트 (선택적)
        snapshot = None
        if req.ticker and req.market:
            try:
                snapshot = await ind_svc.get_indicators_snapshot(req.ticker, req.market)
            except Exception:
                pass

        # ChatMessage 질문 먼저 저장
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

        # 응답 완료 후 answer 업데이트
        msg.answer = full_answer
        await db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")
