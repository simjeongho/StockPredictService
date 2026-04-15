"""관심 종목 라우터 — contracts/watchlist.md 기준."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.models.user import User
from app.models.watchlist import Watchlist
from app.schemas.watchlist import WatchlistAddRequest, WatchlistItem, WatchlistResponse
from app.services.auth import get_current_user
from app.services.market_data import get_current_price

router = APIRouter(prefix="/api/v1/watchlist", tags=["관심 종목"])
logger = logging.getLogger(__name__)

MAX_WATCHLIST = 30


@router.get("", response_model=WatchlistResponse)
async def list_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """관심 종목 목록 + 현재가 반환."""
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == current_user.id)
    )
    items = result.scalars().all()

    watchlist_items = []
    for item in items:
        try:
            price_info = await get_current_price(item.ticker, item.market)
            current_price = price_info["current"]
            change_pct = price_info["change_pct"]
            volume = price_info["volume"]
        except Exception:
            current_price = 0.0
            change_pct = 0.0
            volume = 0

        watchlist_items.append(
            WatchlistItem(
                id=str(item.id),
                ticker=item.ticker,
                market=item.market,
                display_name=item.display_name,
                current_price=current_price,
                change_pct=change_pct,
                volume=volume,
                added_at=item.created_at.isoformat(),
            )
        )

    return WatchlistResponse(
        items=watchlist_items, total=len(watchlist_items), limit=MAX_WATCHLIST
    )


@router.post("", response_model=WatchlistItem, status_code=201)
async def add_watchlist(
    req: WatchlistAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """관심 종목 추가 (최대 30개, 중복 방지)."""
    # 30개 제한 확인
    count_result = await db.execute(
        select(func.count()).where(Watchlist.user_id == current_user.id)
    )
    count = count_result.scalar_one()
    if count >= MAX_WATCHLIST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "WATCHLIST_LIMIT", "message": f"관심 종목은 최대 {MAX_WATCHLIST}개까지 등록할 수 있습니다."},
        )

    # 중복 확인
    dup = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.ticker == req.ticker.upper(),
            Watchlist.market == req.market,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "ALREADY_EXISTS", "message": "이미 등록된 관심 종목입니다."},
        )

    item = Watchlist(
        user_id=current_user.id,
        ticker=req.ticker.upper(),
        market=req.market,
        display_name=req.display_name,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    try:
        price_info = await get_current_price(item.ticker, item.market)
    except Exception:
        price_info = {"current": 0.0, "change_pct": 0.0, "volume": 0}

    return WatchlistItem(
        id=str(item.id),
        ticker=item.ticker,
        market=item.market,
        display_name=item.display_name,
        current_price=price_info["current"],
        change_pct=price_info["change_pct"],
        volume=price_info["volume"],
        added_at=item.created_at.isoformat(),
    )


@router.delete("/{ticker}", status_code=204)
async def remove_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """관심 종목 삭제."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.ticker == ticker.upper(),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": "해당 관심 종목을 찾을 수 없습니다."},
        )
    await db.delete(item)
    await db.commit()
