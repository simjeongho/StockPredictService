from datetime import datetime
from pydantic import BaseModel


class HistoryItem(BaseModel):
    id: int
    ticker: str
    market: str
    buy_score_short: int | None
    buy_score_short_label: str | None
    buy_score_mid: int | None
    buy_score_mid_label: str | None
    buy_score_long: int | None
    buy_score_long_label: str | None
    analysis_type: str = "stock"
    tickers_json: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HistoryDetail(HistoryItem):
    analysis_text: str
