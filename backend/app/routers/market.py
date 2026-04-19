"""시장 이슈 라우터."""
import json
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.market_issues_cache import MarketIssuesCache
from app.models.user import User
from app.services import claude
from app.services.auth import get_current_user_optional
from app.services import usage as usage_svc

router = APIRouter(prefix="/api/v1/market", tags=["시장"])
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

MARKET_ISSUES_DAILY_LIMIT = 5
CACHE_TTL_HOURS = 4
DEFAULT_ISSUE_COUNT = 5


@router.get("/issues/usage")
async def get_market_issues_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """오늘 시장 이슈 조회 횟수 반환."""
    if not current_user:
        return {"used": 0, "limit": MARKET_ISSUES_DAILY_LIMIT}
    used = await usage_svc.get_daily_usage_today(db, current_user.id, "market_issues")
    return {"used": used, "limit": MARKET_ISSUES_DAILY_LIMIT}


@router.get("/issues")
@limiter.limit("20/minute")
async def get_market_issues(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """시장 이슈 SSE 스트리밍 (4시간 캐시)."""

    async def generate():
        # 캐시 확인 먼저 (캐시 히트 시 사용량 미증가)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
        result = await db.execute(
            select(MarketIssuesCache)
            .where(MarketIssuesCache.created_at >= cutoff)
            .order_by(desc(MarketIssuesCache.created_at))
            .limit(1)
        )
        cached = result.scalar_one_or_none()

        if cached:
            used = 0
            if current_user:
                used = await usage_svc.get_daily_usage_today(db, current_user.id, "market_issues")
            yield f"data: {json.dumps({'type': 'cached', 'cached_at': cached.created_at.isoformat(), 'usage': {'used': used, 'limit': MARKET_ISSUES_DAILY_LIMIT}}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'text', 'text': cached.issues_text}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 로그인 사용자 일일 사용량 체크 (실제 Claude 호출 시에만)
        if current_user:
            allowed = await usage_svc.check_and_increment_daily(
                db, current_user.id, "market_issues", limit=MARKET_ISSUES_DAILY_LIMIT
            )
            if not allowed:
                yield f"data: {json.dumps({'type': 'error', 'text': f'오늘 시장 이슈 조회 횟수({MARKET_ISSUES_DAILY_LIMIT}회)를 초과했습니다.'}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

        # Claude Haiku 스트리밍
        full_text = ""
        has_error = False
        async for chunk in claude.stream_market_issues(DEFAULT_ISSUE_COUNT):
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

        # 캐시 저장
        if not has_error and full_text:
            try:
                cache_entry = MarketIssuesCache(
                    issues_text=full_text,
                    issue_count=DEFAULT_ISSUE_COUNT,
                )
                db.add(cache_entry)
                await db.commit()
            except Exception as e:
                logger.warning("시장 이슈 캐시 저장 실패: %s", e)

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
