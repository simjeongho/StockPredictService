"""인증 라우터 — contracts/auth.md 기준."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import (
    verify_nextauth_token,
    get_or_create_user,
    get_current_user,
    delete_user,
)

router = APIRouter(tags=["인증"])
logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class VerifyResponse(BaseModel):
    user_id: str
    email: str
    name: str
    provider: str
    is_new_user: bool


class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    name: str
    provider: str
    created_at: str
    watchlist_count: int


class UpdateProfileRequest(BaseModel):
    name: str


class UpdateProfileResponse(BaseModel):
    user_id: str
    email: str
    name: str
    provider: str
    updated_at: str


@router.post("/api/v1/auth/verify", response_model=VerifyResponse)
async def verify_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """NextAuth.js JWT 토큰 검증 및 사용자 DB 등록·조회."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "로그인이 필요합니다."},
        )
    payload = verify_nextauth_token(credentials.credentials)
    user, is_new = await get_or_create_user(db, payload)
    return VerifyResponse(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        provider=user.provider,
        is_new_user=is_new,
    )


@router.get("/api/v1/users/me", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """현재 로그인한 사용자 프로필 조회."""
    from sqlalchemy import select, func
    from app.models.watchlist import Watchlist

    result = await db.execute(
        select(func.count()).where(Watchlist.user_id == current_user.id)
    )
    watchlist_count = result.scalar_one()

    return UserProfileResponse(
        user_id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        provider=current_user.provider,
        created_at=current_user.created_at.isoformat(),
        watchlist_count=watchlist_count,
    )


@router.put("/api/v1/users/me", response_model=UpdateProfileResponse)
async def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """사용자 프로필 수정 (닉네임)."""
    if not 1 <= len(req.name) <= 100:
        raise HTTPException(
            status_code=422,
            detail={"error": "VALIDATION_ERROR", "message": "닉네임은 1자 이상 100자 이하여야 합니다."},
        )
    from datetime import datetime, timezone
    from sqlalchemy import update

    now = datetime.now(timezone.utc)
    from app.models.user import User as UserModel

    await db.execute(
        update(UserModel).where(UserModel.id == current_user.id).values(name=req.name)
    )
    await db.commit()

    return UpdateProfileResponse(
        user_id=str(current_user.id),
        email=current_user.email,
        name=req.name,
        provider=current_user.provider,
        updated_at=now.isoformat(),
    )


@router.delete("/api/v1/users/me", status_code=204)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    회원 탈퇴 (FR-020).
    watchlist 삭제 + chat_messages 익명화 + 소프트 삭제.
    """
    if current_user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "ALREADY_DELETED", "message": "이미 탈퇴한 계정입니다."},
        )
    await delete_user(db, current_user.id)
