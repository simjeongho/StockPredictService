from pydantic import BaseModel
from typing import Literal


class WatchlistAddRequest(BaseModel):
    ticker: str
    market: Literal["us", "kr"]
    display_name: str


class WatchlistItem(BaseModel):
    id: str
    ticker: str
    market: Literal["us", "kr"]
    display_name: str
    current_price: float
    change_pct: float
    volume: int
    added_at: str


class WatchlistResponse(BaseModel):
    items: list[WatchlistItem]
    total: int
    limit: int
