"""예측 점수 Pydantic 스키마 — contracts/scores.md 기준."""
from pydantic import BaseModel


class BuyScoreTermWithColor(BaseModel):
    period: str | None = None
    score: int
    label: str
    color: str


class BuyScoreWithColor(BaseModel):
    short_term: BuyScoreTermWithColor
    mid_term: BuyScoreTermWithColor
    long_term: BuyScoreTermWithColor


class ScoreResponse(BaseModel):
    """GET /api/v1/stocks/{ticker}/score 응답."""
    ticker: str
    market: str
    analyzed_at: str
    expires_at: str
    buy_score: BuyScoreWithColor
    score_rationale: str | None = None


class ScoreItem(BaseModel):
    """점수 랭킹 개별 아이템."""
    ticker: str
    display_name: str
    market: str
    current_price: float
    change_pct: float
    buy_score: BuyScoreWithColor
    total_score: int
    analyzed_at: str
    in_watchlist: bool
    score_rationale: str | None = None


class ScoreRankingResponse(BaseModel):
    """GET /api/v1/scores/ranking 응답."""
    market: str
    sort_by: str
    as_of: str
    items: list[ScoreItem]
    total: int
    disclaimer: str
