"""PostgreSQL analysis_cache TTL 캐싱 서비스."""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.config import get_settings
from app.models.analysis_cache import AnalysisCache

logger = logging.getLogger(__name__)
settings = get_settings()


async def get_valid_cache(
    db: AsyncSession, ticker: str, market: str
) -> AnalysisCache | None:
    """유효한 캐시 조회 (expires_at > now()). 만료 레코드는 동시에 정리한다."""
    now = datetime.now(timezone.utc)

    # 만료 레코드 정리
    await db.execute(delete(AnalysisCache).where(AnalysisCache.expires_at <= now))
    await db.commit()

    result = await db.execute(
        select(AnalysisCache)
        .where(
            AnalysisCache.ticker == ticker.upper(),
            AnalysisCache.market == market,
            AnalysisCache.expires_at > now,
        )
        .order_by(AnalysisCache.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def save_cache(
    db: AsyncSession,
    ticker: str,
    market: str,
    analysis_text: str,
    indicators_snapshot: dict,
    buy_score: dict | None,
    global_events_summary: str | None = None,
) -> AnalysisCache:
    """분석 결과를 캐시에 저장한다."""
    now = datetime.now(timezone.utc)
    ttl = settings.analysis_cache_ttl_seconds
    expires_at = now + timedelta(seconds=ttl)

    cache = AnalysisCache(
        ticker=ticker.upper(),
        market=market,
        analysis_text=analysis_text,
        indicators_snapshot=indicators_snapshot,
        global_events_summary=global_events_summary,
        expires_at=expires_at,
    )

    if buy_score:
        short = buy_score.get("short_term", {})
        mid = buy_score.get("mid_term", {})
        long_ = buy_score.get("long_term", {})
        cache.buy_score_short = short.get("score")
        cache.buy_score_short_label = short.get("label")
        cache.buy_score_mid = mid.get("score")
        cache.buy_score_mid_label = mid.get("label")
        cache.buy_score_long = long_.get("score")
        cache.buy_score_long_label = long_.get("label")

    db.add(cache)
    await db.commit()
    await db.refresh(cache)
    return cache


async def cleanup_expired(db: AsyncSession) -> int:
    """만료된 캐시 레코드를 모두 삭제하고 삭제된 수를 반환한다."""
    now = datetime.now(timezone.utc)
    result = await db.execute(delete(AnalysisCache).where(AnalysisCache.expires_at <= now))
    await db.commit()
    return result.rowcount
