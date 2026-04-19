"""관리자 라우터."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.models.user import User
from app.models.analysis_usage import AnalysisUsage
from app.services.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/api/v1/admin", tags=["관리자"])
logger = logging.getLogger(__name__)
settings = get_settings()


def require_admin(current_user: User) -> User:
    """관리자 권한 확인. is_admin 플래그 또는 ADMIN_EMAILS 목록으로 판단."""
    if current_user.is_admin or current_user.email in settings.admin_emails_list:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error": "FORBIDDEN", "message": "관리자 권한이 필요합니다."},
    )


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """사용자 목록 조회."""
    require_admin(current_user)
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "name": u.name,
            "provider": u.provider,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat(),
            "deleted_at": u.deleted_at.isoformat() if u.deleted_at else None,
        }
        for u in users
    ]


@router.get("/usage")
async def usage_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """오늘 분석 사용 현황 요약."""
    require_admin(current_user)
    from app.services.usage import today_kst
    today = today_kst()

    result = await db.execute(
        select(
            AnalysisUsage.user_id,
            func.sum(AnalysisUsage.count).label("total"),
        )
        .where(AnalysisUsage.usage_date == today)
        .group_by(AnalysisUsage.user_id)
    )
    rows = result.all()
    return [{"user_id": str(r.user_id), "total_analyses": r.total} for r in rows]


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """사용자 계정 비활성화."""
    require_admin(current_user)
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="유효하지 않은 user_id 형식입니다.")

    result = await db.execute(select(User).where(User.id == uid))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신을 차단할 수 없습니다.")

    await db.execute(
        update(User).where(User.id == uid).values(is_active=False)
    )
    await db.commit()
    return {"message": f"{target.email} 계정이 비활성화되었습니다."}


@router.post("/usage/reset")
async def reset_usage(
    ticker: str,
    market: str = "us",
    target_user_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 종목 분석 횟수 초기화 (관리자 전용)."""
    require_admin(current_user)
    from app.services.usage import reset_analysis_usage
    uid = current_user.id
    if target_user_id:
        try:
            uid = uuid.UUID(target_user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="유효하지 않은 user_id 형식입니다.")
    await reset_analysis_usage(db, uid, ticker, market)
    return {"message": f"{ticker.upper()} ({market}) 분석 횟수가 초기화되었습니다."}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """사용자 계정 활성화."""
    require_admin(current_user)
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="유효하지 않은 user_id 형식입니다.")

    await db.execute(update(User).where(User.id == uid).values(is_active=True))
    await db.commit()
    return {"message": "계정이 활성화되었습니다."}
