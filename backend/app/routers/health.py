from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    # 비동기 DB 핑
    await db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "db": "connected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
