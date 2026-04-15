"""NextAuth.js JWT 검증 및 사용자 관리 서비스."""
import logging
import uuid
from datetime import datetime, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.config import get_settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


def verify_nextauth_token(token: str) -> dict:
    """
    NextAuth.js JWT 토큰 검증 → user_id, email, name, provider 반환.

    Raises:
        HTTPException 401: 유효하지 않은 토큰
        HTTPException 401: 만료된 토큰
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "TOKEN_EXPIRED", "message": "인증 토큰이 만료되었습니다. 다시 로그인해 주세요."},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_TOKEN", "message": "유효하지 않은 인증 토큰입니다."},
        )


async def get_or_create_user(db: AsyncSession, payload: dict) -> tuple[User, bool]:
    """
    JWT 페이로드로 사용자 조회 또는 생성.
    반환: (user, is_new_user)
    """
    provider = payload.get("provider", "google")
    email = (payload.get("email") or "").lower()
    name = payload.get("name", "")
    user_id_str = payload.get("user_id") or payload.get("sub", "")

    # user_id로 우선 조회
    user = None
    if user_id_str:
        try:
            uid = uuid.UUID(user_id_str)
            result = await db.execute(select(User).where(User.id == uid))
            user = result.scalar_one_or_none()
        except (ValueError, Exception):
            pass

    # 없으면 이메일+provider로 조회
    if not user and email:
        result = await db.execute(
            select(User).where(User.email == email, User.provider == provider)
        )
        user = result.scalar_one_or_none()

    if user:
        # 탈퇴한 계정 차단
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "ACCOUNT_DELETED", "message": "탈퇴한 계정입니다. 재가입해 주세요."},
            )
        return user, False

    # 신규 사용자 생성
    new_user = User(
        email=email,
        name=name,
        provider=provider,
        provider_account_id=payload.get("provider_account_id", user_id_str),
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user, True


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI 의존성: 인증된 사용자 반환. 탈퇴 계정 접근 시 403."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "로그인이 필요합니다."},
        )
    payload = verify_nextauth_token(credentials.credentials)
    user, _ = await get_or_create_user(db, payload)
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """FastAPI 의존성: 인증된 사용자 반환. 미인증 시 None 반환 (예외 없음)."""
    if not credentials:
        return None
    try:
        payload = verify_nextauth_token(credentials.credentials)
        user, _ = await get_or_create_user(db, payload)
        return user
    except HTTPException:
        return None


async def delete_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    """
    회원 탈퇴 처리:
    1. watchlist CASCADE 삭제 (외래 키 ondelete=CASCADE 자동 처리)
    2. chat_messages user_id → NULL 익명화
    3. users is_active=false, deleted_at=now()
    모든 처리는 단일 트랜잭션 내에서 실행된다.
    """
    from app.models.watchlist import Watchlist
    from app.models.chat_message import ChatMessage
    from sqlalchemy import delete as sa_delete

    now = datetime.now(timezone.utc)

    # 관심 종목 물리 삭제
    await db.execute(sa_delete(Watchlist).where(Watchlist.user_id == user_id))

    # 챗봇 메시지 익명화
    await db.execute(
        update(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .values(user_id=None)
    )

    # 사용자 소프트 삭제
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_active=False, deleted_at=now)
    )

    await db.commit()
