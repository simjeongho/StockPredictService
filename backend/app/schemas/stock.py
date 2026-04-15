from pydantic import BaseModel
from typing import Literal


class StockSearchResult(BaseModel):
    ticker: str
    name: str
    market: Literal["us", "kr"]
    exchange: str
    current_price: float
    change_pct: float
    volume: int
    market_cap: float
    currency: str


class Candle(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class PriceResponse(BaseModel):
    ticker: str
    market: Literal["us", "kr"]
    period: str
    candles: list[Candle]
    market_status: Literal["open", "closed", "holiday"]
    last_updated: str


class SMAData(BaseModel):
    sma5: float | None
    sma20: float | None
    sma50: float | None
    sma200: float | None


class RSIData(BaseModel):
    rsi14: float | None


class MACDData(BaseModel):
    macd: float | None
    signal: float | None
    histogram: float | None


class BollingerData(BaseModel):
    upper: float | None
    middle: float | None
    lower: float | None


class StochasticData(BaseModel):
    k: float | None
    d: float | None


class PriceInfo(BaseModel):
    current: float
    change_pct: float
    volume: int
    market_cap: float


class IndicatorsResponse(BaseModel):
    ticker: str
    market: Literal["us", "kr"]
    as_of: str
    price: PriceInfo
    sma: SMAData
    rsi: RSIData
    macd: MACDData
    bollinger: BollingerData
    stochastic: StochasticData


class IndexSummary(BaseModel):
    name: str
    value: float
    change_pct: float


class MarketSummaryResponse(BaseModel):
    market: str
    indices: list[IndexSummary]
    as_of: str
