"""분석 기록 라우터."""
import logging

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.analysis_history import AnalysisHistory
from app.models.user import User
from app.schemas.history import HistoryItem, HistoryDetail
from app.services.auth import get_current_user
from app.services.usage import today_kst

KST = ZoneInfo("Asia/Seoul")

router = APIRouter(prefix="/api/v1/history", tags=["분석 기록"])
logger = logging.getLogger(__name__)


@router.get("/today", response_model=HistoryDetail | None)
async def get_today_score(
    ticker: str = Query(...),
    market: str = Query("us"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KST 기준 오늘 해당 종목의 최신 분석 결과 반환. 없으면 null."""
    today_start = datetime.combine(today_kst(), datetime.min.time()).replace(tzinfo=KST)
    result = await db.execute(
        select(AnalysisHistory)
        .where(
            AnalysisHistory.user_id == current_user.id,
            AnalysisHistory.ticker == ticker.upper(),
            AnalysisHistory.market == market,
            AnalysisHistory.created_at >= today_start,
            AnalysisHistory.analysis_type == "stock",
        )
        .order_by(desc(AnalysisHistory.created_at))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    return HistoryDetail.model_validate(record) if record else None


@router.get("", response_model=list[HistoryItem])
async def get_history(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """로그인 사용자의 분석 기록 목록."""
    result = await db.execute(
        select(AnalysisHistory)
        .where(AnalysisHistory.user_id == current_user.id)
        .order_by(desc(AnalysisHistory.created_at))
        .offset(skip)
        .limit(limit)
    )
    records = result.scalars().all()
    return [HistoryItem.model_validate(r) for r in records]


@router.get("/{history_id}", response_model=HistoryDetail)
async def get_history_detail(
    history_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분석 기록 상세 조회."""
    result = await db.execute(
        select(AnalysisHistory).where(
            AnalysisHistory.id == history_id,
            AnalysisHistory.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
    return HistoryDetail.model_validate(record)
