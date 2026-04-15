"""예측 점수 라우터 — contracts/scores.md 기준."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.analysis_cache import AnalysisCache
from app.models.watchlist import Watchlist
from app.models.user import User
from app.schemas.score import (
    ScoreResponse,
    ScoreItem,
    ScoreRankingResponse,
    BuyScoreWithColor,
    BuyScoreTermWithColor,
)
from app.services.auth import get_current_user_optional

router = APIRouter(tags=["예측 점수"])
logger = logging.getLogger(__name__)

DISCLAIMER = "본 점수는 AI 예측 참고용이며, 투자 결정의 책임은 사용자에게 있습니다."

_SCORE_COLORS = {
    "강력 매도": "#EF4444",
    "매도 고려": "#F97316",
    "중립": "#EAB308",
    "매수 고려": "#84CC16",
    "강력 매수": "#22C55E",
}


def _score_label(score: int) -> str:
    if score <= 20:
        return "강력 매도"
    if score <= 40:
        return "매도 고려"
    if score <= 60:
        return "중립"
    if score <= 80:
        return "매수 고려"
    return "강력 매수"


def _build_buy_score(cache: AnalysisCache) -> BuyScoreWithColor:
    def term(score: int | None, label: str | None, period: str) -> BuyScoreTermWithColor:
        s = score if score is not None else 50
        lbl = label or _score_label(s)
        return BuyScoreTermWithColor(
            period=period,
            score=s,
            label=lbl,
            color=_SCORE_COLORS.get(lbl, "#EAB308"),
        )

    return BuyScoreWithColor(
        short_term=term(cache.buy_score_short, cache.buy_score_short_label, "1주"),
        mid_term=term(cache.buy_score_mid, cache.buy_score_mid_label, "3개월"),
        long_term=term(cache.buy_score_long, cache.buy_score_long_label, "1년"),
    )


@router.get("/api/v1/stocks/{ticker}/score", response_model=ScoreResponse)
async def get_ticker_score(
    ticker: str,
    market: str = Query("us"),
    db: AsyncSession = Depends(get_db),
):
    """특정 종목의 최신 유효 예측 점수 조회."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(AnalysisCache)
        .where(
            AnalysisCache.ticker == ticker.upper(),
            AnalysisCache.market == market,
            AnalysisCache.expires_at > now,
            AnalysisCache.buy_score_short.is_not(None),
        )
        .order_by(AnalysisCache.created_at.desc())
        .limit(1)
    )
    cache = result.scalar_one_or_none()
    if not cache:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "NO_SCORE_AVAILABLE",
                "message": "아직 분석된 점수가 없습니다. AI 분석을 먼저 실행해 주세요.",
            },
        )
    return ScoreResponse(
        ticker=cache.ticker,
        market=cache.market,
        analyzed_at=cache.created_at.isoformat(),
        expires_at=cache.expires_at.isoformat(),
        buy_score=_build_buy_score(cache),
        score_rationale=cache.score_rationale,
    )


@router.get("/api/v1/scores/ranking", response_model=ScoreRankingResponse)
async def get_score_ranking(
    market: str = Query("us"),
    sort_by: str = Query("short"),
    watchlist_only: bool = Query(True),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """분석 완료된 종목들의 예측 점수 랭킹 조회."""
    if watchlist_only and not current_user:
        raise HTTPException(
            status_code=401,
            detail={"error": "UNAUTHORIZED", "message": "관심 종목 필터링에는 로그인이 필요합니다."},
        )

    now = datetime.now(timezone.utc)

    # 관심 종목 및 display_name 맵
    watchlist_map: dict[str, str] = {}
    if current_user:
        wl_result = await db.execute(
            select(Watchlist.ticker, Watchlist.display_name)
            .where(Watchlist.user_id == current_user.id)
        )
        watchlist_map = {row[0]: row[1] for row in wl_result.fetchall()}

    # 캐시 쿼리
    query = (
        select(AnalysisCache)
        .where(
            AnalysisCache.market == market,
            AnalysisCache.expires_at > now,
            AnalysisCache.buy_score_short.is_not(None),
        )
        .order_by(AnalysisCache.created_at.desc())
    )
    if watchlist_only and watchlist_map:
        query = query.where(AnalysisCache.ticker.in_(watchlist_map.keys()))
    elif watchlist_only:
        # 관심 종목 없음
        return ScoreRankingResponse(
            market=market,
            sort_by=sort_by,
            as_of=now.isoformat(),
            items=[],
            total=0,
            disclaimer=DISCLAIMER,
        )

    result = await db.execute(query)
    caches = result.scalars().all()

    # ticker당 최신 1개만 유지
    seen: dict[str, AnalysisCache] = {}
    for c in caches:
        if c.ticker not in seen:
            seen[c.ticker] = c

    # ScoreItem 빌드
    items: list[ScoreItem] = []
    for c in seen.values():
        short_s = c.buy_score_short or 50
        mid_s = c.buy_score_mid or 50
        long_s = c.buy_score_long or 50
        total = round((short_s + mid_s + long_s) / 3)

        # 지표 스냅샷에서 현재가·등락률 추출 (없으면 0)
        snapshot: dict = c.indicators_snapshot or {}
        price_info = snapshot.get("price", {})
        current_price = float(price_info.get("current", 0))
        change_pct = float(price_info.get("change_pct", 0))

        items.append(
            ScoreItem(
                ticker=c.ticker,
                display_name=watchlist_map.get(c.ticker, c.ticker),
                market=c.market,
                current_price=current_price,
                change_pct=change_pct,
                buy_score=_build_buy_score(c),
                total_score=total,
                analyzed_at=c.created_at.isoformat(),
                in_watchlist=c.ticker in watchlist_map,
                score_rationale=c.score_rationale,
            )
        )

    # 정렬
    sort_fn = {
        "short": lambda x: x.buy_score.short_term.score,
        "mid": lambda x: x.buy_score.mid_term.score,
        "long": lambda x: x.buy_score.long_term.score,
        "total": lambda x: x.total_score,
    }.get(sort_by, lambda x: x.buy_score.short_term.score)
    items.sort(key=sort_fn, reverse=True)

    return ScoreRankingResponse(
        market=market,
        sort_by=sort_by,
        as_of=now.isoformat(),
        items=items,
        total=len(items),
        disclaimer=DISCLAIMER,
    )
