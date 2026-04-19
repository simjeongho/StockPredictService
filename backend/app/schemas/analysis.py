from pydantic import BaseModel, field_validator
from typing import Literal


class AnalyzeRequest(BaseModel):
    ticker: str
    market: Literal["us", "kr"] = "us"
    period: Literal["1m", "3m", "6m", "1y"] = "3m"


class ComparisonRequest(BaseModel):
    tickers: list[str]
    market: Literal["us", "kr"] = "us"

    @field_validator("tickers")
    @classmethod
    def validate_tickers(cls, v: list[str]) -> list[str]:
        if not 2 <= len(v) <= 4:
            raise ValueError("tickers는 2~4개여야 합니다.")
        return [t.strip().upper() for t in v if t.strip()]


class ChatRequest(BaseModel):
    ticker: str | None = None
    market: Literal["us", "kr"] | None = None
    message: str


class BuyScoreTerm(BaseModel):
    period: str
    score: int
    label: str


class BuyScore(BaseModel):
    short_term: BuyScoreTerm
    mid_term: BuyScoreTerm
    long_term: BuyScoreTerm


class AnalyzeEventChunk(BaseModel):
    type: Literal["text", "score", "disclaimer", "cached", "out_of_scope", "done"]
    text: str | None = None
    score: BuyScore | None = None
    disclaimer: str | None = None
    cached_at: str | None = None
