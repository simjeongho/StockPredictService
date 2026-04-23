"""KOSPI+KOSDAQ 종목 마스터 초기 적재 스크립트."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.services.stocks_master import refresh_kr_stocks


async def main():
    print("종목 마스터 적재 시작 (약 2~5분 소요)...")
    async with AsyncSessionLocal() as db:
        result = await refresh_kr_stocks(db)
    print("\n완료!")
    print(f"  수집: {result['total_collected']}건")
    print(f"  활성: {result['total_active']}건")
    print(f"  비활성화: {result['deactivated']}건")
    print(f"  소요시간: {result['duration_sec']}초")


if __name__ == "__main__":
    asyncio.run(main())
