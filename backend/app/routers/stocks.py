"""주가 데이터 라우터 — contracts/stocks.md 기준."""
import logging
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.schemas.stock import (
    StockSearchResult,
    PriceResponse,
    IndicatorsResponse,
    MarketSummaryResponse,
    Candle,
    PriceInfo,
    SMAData,
    RSIData,
    MACDData,
    BollingerData,
    StochasticData,
    IndexSummary,
)
from app.services import market_data, indicators as ind_svc

router = APIRouter(prefix="/api/v1/stocks", tags=["주가 데이터"])
logger = logging.getLogger(__name__)


@router.get("/search", response_model=list[StockSearchResult])
async def search_stocks(
    q: str = Query(..., min_length=1, description="종목명 또는 티커"),
    market: Literal["us", "kr"] | None = Query(None),
):
    """종목명·티커로 검색. 동명 종목의 거래소명 포함."""
    if not q.strip():
        raise HTTPException(status_code=400, detail="검색어를 입력해 주세요.")
    try:
        results = await market_data.search_stock(q.strip(), market)
        if not results:
            return []
        return [StockSearchResult(**r) for r in results]
    except Exception as e:
        logger.error("종목 검색 오류: %s", e)
        raise HTTPException(status_code=503, detail="시장 데이터를 일시적으로 조회할 수 없습니다.")


@router.get("/{ticker}/price", response_model=PriceResponse)
async def get_price(
    ticker: str,
    period: Literal["1m", "3m", "6m", "1y"] = Query("1m"),
    market: Literal["us", "kr"] = Query("us"),
):
    """주가 OHLCV 캔들 데이터 반환."""
    try:
        candles, status, last_updated = await market_data.get_ohlcv(ticker, market, period)
        return PriceResponse(
            ticker=ticker.upper(),
            market=market,
            period=period,
            candles=[Candle(**c) for c in candles],
            market_status=status,
            last_updated=last_updated,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("주가 조회 오류 [%s]: %s", ticker, e)
        raise HTTPException(status_code=503, detail="주가 데이터를 일시적으로 조회할 수 없습니다.")


@router.get("/{ticker}/indicators", response_model=IndicatorsResponse)
async def get_indicators(
    ticker: str,
    market: Literal["us", "kr"] = Query("us"),
):
    """SMA·RSI·MACD·볼린저밴드·스토캐스틱 기술 지표 반환."""
    try:
        snapshot = await ind_svc.get_indicators_snapshot(ticker, market)
        return IndicatorsResponse(
            ticker=snapshot["ticker"],
            market=snapshot["market"],
            as_of=snapshot["as_of"],
            price=PriceInfo(**snapshot["price"]),
            sma=SMAData(**snapshot["sma"]),
            rsi=RSIData(**snapshot["rsi"]),
            macd=MACDData(**snapshot["macd"]),
            bollinger=BollingerData(**snapshot["bollinger"]),
            stochastic=StochasticData(**snapshot["stochastic"]),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("기술 지표 조회 오류 [%s]: %s", ticker, e)
        raise HTTPException(status_code=503, detail="기술 지표를 일시적으로 계산할 수 없습니다.")


@router.get("/market/summary", response_model=list[MarketSummaryResponse])
async def get_market_summary():
    """미국·한국 주요 지수 요약 반환."""
    try:
        summaries = await market_data.get_market_summary()
        return [
            MarketSummaryResponse(
                market=s["market"],
                indices=[IndexSummary(**i) for i in s["indices"]],
                as_of=s["as_of"],
            )
            for s in summaries
        ]
    except Exception as e:
        logger.error("시장 요약 조회 오류: %s", e)
        raise HTTPException(status_code=503, detail="시장 요약 데이터를 조회할 수 없습니다.")


class GlobalEventItem(BaseModel):
    ticker: str
    market: str
    summary: str
    analyzed_at: str


@router.get("/market/events", response_model=list[GlobalEventItem])
async def get_global_events(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """최근 AI 분석에서 추출된 글로벌 이벤트 요약 반환."""
    from app.models.analysis_cache import AnalysisCache

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(AnalysisCache)
        .where(
            AnalysisCache.global_events_summary.is_not(None),
            AnalysisCache.expires_at > now,
        )
        .order_by(AnalysisCache.created_at.desc())
        .limit(limit)
    )
    caches = result.scalars().all()
    return [
        GlobalEventItem(
            ticker=c.ticker,
            market=c.market,
            summary=c.global_events_summary,
            analyzed_at=c.created_at.isoformat(),
        )
        for c in caches
    ]
