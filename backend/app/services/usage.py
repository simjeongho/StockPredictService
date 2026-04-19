"""일일 사용량 추적 서비스 — KST 기준 자정 초기화."""
import uuid
from datetime import datetime, date
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

KST = ZoneInfo("Asia/Seoul")


def today_kst() -> date:
    return datetime.now(KST).date()


async def check_and_increment_analysis(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
    market: str,
    limit: int = 3,
) -> bool:
    """종목별 일일 분석 횟수 확인 및 증가. 한도 초과 시 False 반환."""
    today = today_kst()
    result = await db.execute(
        text("""
            INSERT INTO analysis_usage (user_id, ticker, market, usage_date, count)
            VALUES (:user_id, :ticker, :market, :usage_date, 1)
            ON CONFLICT (user_id, ticker, market, usage_date)
            DO UPDATE SET count = analysis_usage.count + 1
            RETURNING count
        """),
        {"user_id": str(user_id), "ticker": ticker.upper(), "market": market, "usage_date": today},
    )
    row = result.fetchone()
    await db.commit()
    return row[0] <= limit


async def check_and_increment_daily(
    db: AsyncSession,
    user_id: uuid.UUID,
    endpoint: str,
    limit: int,
) -> bool:
    """엔드포인트별 일일 사용 횟수 확인 및 증가. 한도 초과 시 False 반환."""
    today = today_kst()
    result = await db.execute(
        text("""
            INSERT INTO daily_usage (user_id, endpoint, usage_date, count)
            VALUES (:user_id, :endpoint, :usage_date, 1)
            ON CONFLICT (user_id, endpoint, usage_date)
            DO UPDATE SET count = daily_usage.count + 1
            RETURNING count
        """),
        {"user_id": str(user_id), "endpoint": endpoint, "usage_date": today},
    )
    row = result.fetchone()
    await db.commit()
    return row[0] <= limit


async def get_daily_usage_today(
    db: AsyncSession,
    user_id: uuid.UUID,
    endpoint: str,
) -> int:
    """엔드포인트별 오늘 사용 횟수 조회 (증가 없음)."""
    today = today_kst()
    result = await db.execute(
        text("""
            SELECT count FROM daily_usage
            WHERE user_id = :user_id AND endpoint = :endpoint AND usage_date = :usage_date
        """),
        {"user_id": str(user_id), "endpoint": endpoint, "usage_date": today},
    )
    row = result.fetchone()
    return row[0] if row else 0


async def reset_analysis_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
    market: str,
) -> None:
    """특정 종목의 오늘 분석 횟수를 0으로 초기화."""
    today = today_kst()
    await db.execute(
        text("""
            UPDATE analysis_usage SET count = 0
            WHERE user_id = :user_id AND ticker = :ticker AND market = :market AND usage_date = :usage_date
        """),
        {"user_id": str(user_id), "ticker": ticker.upper(), "market": market, "usage_date": today},
    )
    await db.commit()


async def get_analysis_usage_today(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
    market: str,
) -> int:
    """오늘 특정 종목 분석 횟수 조회 (증가 없음)."""
    today = today_kst()
    result = await db.execute(
        text("""
            SELECT count FROM analysis_usage
            WHERE user_id = :user_id AND ticker = :ticker AND market = :market AND usage_date = :usage_date
        """),
        {"user_id": str(user_id), "ticker": ticker.upper(), "market": market, "usage_date": today},
    )
    row = result.fetchone()
    return row[0] if row else 0
