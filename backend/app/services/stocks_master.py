"""한국 주식 마스터 데이터 서비스 — 종목명 DB 관리 및 검색."""
import logging
import re
import time
from datetime import datetime

import httpx
from sqlalchemy import select, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock import Stock

logger = logging.getLogger(__name__)

_NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://finance.naver.com/",
}

_SISE_PATTERN = re.compile(r'code=(\d{6})"[^>]*>([^<]+)</a>')


async def _fetch_naver_sise_listing(market_id: str) -> list[tuple[str, str, str]]:
    """네이버 파이낸스 시세 페이지(EUC-KR HTML) 파싱으로 KOSPI/KOSDAQ 전 종목 수집.

    KRX/pykrx API가 인증 없이 작동하지 않으므로 HTML 파싱으로 대체.
    Returns list of (ticker, name, exchange).
    """
    sosok = "0" if market_id == "KOSPI" else "1"
    base_url = f"https://finance.naver.com/sise/sise_market_sum.naver?sosok={sosok}"
    collected: list[tuple[str, str, str]] = []

    async with httpx.AsyncClient(headers=_NAVER_HEADERS, timeout=30, follow_redirects=True) as client:
        page = 1
        while page <= 200:
            url = f"{base_url}&page={page}"
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    break
                text = resp.content.decode("euc-kr", errors="replace")
                matches = _SISE_PATTERN.findall(text)
                if not matches:
                    break
                for code, name in matches:
                    name_clean = name.strip()
                    if name_clean:
                        collected.append((code, name_clean, market_id))
                page += 1
            except Exception as e:
                logger.warning("Naver sise 수집 실패 [%s p%d]: %s", market_id, page, e)
                break

    logger.info("Naver sise %s 수집: %d건 (%d페이지)", market_id, len(collected), page - 1)
    return collected


async def refresh_kr_stocks(db: AsyncSession) -> dict:
    """KOSPI+KOSDAQ 전 종목을 네이버 파이낸스 시세 페이지 파싱으로 수집해 stocks 테이블에 upsert.

    수집 실패 시 예외 전파 (DB 변경 없음 — 기존 데이터 보호).
    수집 종목 수가 100 미만이면 비정상으로 판단해 롤백.
    """
    start_ts = time.time()
    collected: list[tuple[str, str, str]] = []

    for market_id in ("KOSPI", "KOSDAQ"):
        rows = await _fetch_naver_sise_listing(market_id)
        collected.extend(rows)
        logger.info("Naver sise %s 수집: %d건", market_id, len(rows))

    if len(collected) < 100:
        raise RuntimeError(
            f"수집 종목 수 비정상: {len(collected)}건 — KRX 데이터포털 API 응답 확인 필요"
        )

    collected_tickers = {c for c, _, _ in collected}
    now_ts = datetime.now()

    for code, name, exch in collected:
        stmt = pg_insert(Stock).values(
            ticker=code,
            market="kr",
            name=name,
            exchange=exch,
            is_active=True,
            synced_at=now_ts,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["ticker", "market"],
            set_={
                "name": stmt.excluded.name,
                "exchange": stmt.excluded.exchange,
                "is_active": True,
                "synced_at": now_ts,
            },
        )
        await db.execute(stmt)

    # 이번 수집에 없는 기존 KR 종목 soft-delete
    deact_res = await db.execute(
        update(Stock)
        .where(
            Stock.market == "kr",
            Stock.ticker.notin_(collected_tickers),
            Stock.is_active == True,
        )
        .values(is_active=False)
    )
    deactivated = deact_res.rowcount or 0

    tot_res = await db.execute(
        select(func.count())
        .select_from(Stock)
        .where(Stock.market == "kr", Stock.is_active == True)
    )
    total_active = tot_res.scalar_one()

    await db.commit()

    duration = round(time.time() - start_ts, 2)
    logger.info(
        "stocks refresh 완료: %d건 수집, %d건 비활성화, %.1fs",
        len(collected), deactivated, duration,
    )
    return {
        "inserted_or_updated": len(collected),
        "deactivated": deactivated,
        "total_collected": len(collected),
        "total_active": total_active,
        "duration_sec": duration,
    }


async def search_kr_by_name(db: AsyncSession, q: str, limit: int = 5) -> list[tuple[str, str]]:
    """stocks 테이블에서 종목명/티커 LIKE 검색. DB 미적재 시 Naver API fallback.

    Returns list of (ticker, name) tuples.
    """
    if not q.strip():
        return []

    pattern = f"%{q.strip()}%"
    exact = q.strip()
    prefix = f"{q.strip()}%"

    stmt = (
        select(Stock.ticker, Stock.name)
        .where(
            Stock.market == "kr",
            Stock.is_active == True,
            (Stock.name.ilike(pattern) | Stock.ticker.ilike(pattern)),
        )
        .order_by(
            (Stock.name == exact).desc(),
            Stock.name.ilike(prefix).desc(),
            Stock.name,
        )
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = [(row.ticker, row.name) for row in result.all()]

    if rows:
        return rows

    # DB 미적재(빈 테이블) 시 Naver Finance autocomplete API로 실시간 검색
    logger.info("stocks DB 미적재, Naver autocomplete API로 검색: %s", q)
    return await _search_naver_autocomplete(q, limit)


async def _search_naver_autocomplete(q: str, limit: int = 5) -> list[tuple[str, str]]:
    """Naver Finance 자동완성 API로 실시간 종목 검색. (ticker, name) 반환."""
    url = f"https://ac.stock.naver.com/ac?q={q}&target=stock,index,fund,futures,etf"
    try:
        async with httpx.AsyncClient(headers=_NAVER_HEADERS, timeout=5) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            return []
        items = resp.json().get("items", [])
        kr_stocks = [
            i for i in items
            if i.get("nationCode") == "KOR"
            and i.get("category") == "stock"
            and i.get("typeCode") in ("KOSPI", "KOSDAQ")
            and len(i.get("code", "")) == 6
            and i.get("code", "").isdigit()
        ]
        return [(item["code"], item["name"]) for item in kr_stocks[:limit]]
    except Exception as e:
        logger.warning("Naver autocomplete 검색 실패: %s", e)
        return []
