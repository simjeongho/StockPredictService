"""yfinance(미국) + FinanceDataReader(한국) 통합 시장 데이터 서비스."""
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Literal

import pandas as pd
import yfinance as yf
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

PERIOD_MAP = {
    "1m": "1mo",
    "3m": "3mo",
    "6m": "6mo",
    "1y": "1y",
    "3y": "3y",
    "5y": "5y",
}

# KR 시장용 기간별 일수 (FinanceDataReader는 start date 방식)
KR_PERIOD_DAYS = {
    "1m": 31,
    "3m": 92,
    "6m": 183,
    "1y": 365,
    "3y": 1095,
    "5y": 1825,
}

# 미국 지수 티커
US_INDICES = {
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "DOW": "^DJI",
}


def _market_status(ticker_obj: yf.Ticker) -> Literal["open", "closed", "holiday"]:
    """장 상태 판별 (간단 휴리스틱)."""
    try:
        info = ticker_obj.fast_info
        if hasattr(info, "regular_market_previous_close"):
            now = datetime.now(timezone.utc)
            # 주말 판별
            if now.weekday() >= 5:
                return "holiday"
        return "closed"
    except Exception:
        return "closed"


async def search_stock(q: str, market: str | None = None, db: AsyncSession | None = None) -> list[dict]:
    """종목명·티커로 검색. 동명 종목의 경우 거래소명을 함께 반환한다."""
    results = []
    try:
        ticker = yf.Ticker(q.upper())
        info = ticker.info
        if info.get("regularMarketPrice") or info.get("currentPrice"):
            price = info.get("regularMarketPrice") or info.get("currentPrice", 0)
            results.append(
                {
                    "ticker": q.upper(),
                    "name": info.get("longName") or info.get("shortName", q.upper()),
                    "market": "us",
                    "exchange": info.get("exchange", "NASDAQ"),
                    "current_price": price,
                    "change_pct": info.get("regularMarketChangePercent", 0.0),
                    "volume": info.get("regularMarketVolume", 0),
                    "market_cap": info.get("marketCap", 0),
                    "currency": info.get("currency", "USD"),
                }
            )
    except Exception as e:
        logger.warning("yfinance 검색 오류: %s", e)

    # 한국 주식 — fdr.StockListing('KRX')가 KRX 서버 변경으로 파싱 실패하므로 우회
    if not market or market == "kr":
        try:
            import FinanceDataReader as fdr

            recent_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

            if re.fullmatch(r"\d{6}", q.strip()):
                # 6자리 숫자 코드 직접 조회
                codes_to_fetch = [(q.strip(), None)]
            else:
                # 텍스트 검색: DB stocks 마스터에서 종목명/티커 검색
                codes_to_fetch = []
                if db is not None:
                    from app.services.stocks_master import search_kr_by_name
                    pairs = await search_kr_by_name(db, q, limit=5)
                    codes_to_fetch = [(ticker, name) for ticker, name in pairs]

            for code, name_hint in codes_to_fetch:
                try:
                    df = fdr.DataReader(code, recent_date)
                    if df.empty:
                        continue
                    last = df.iloc[-1]
                    prev = df.iloc[-2] if len(df) > 1 else last
                    change_pct = (
                        (float(last["Close"]) - float(prev["Close"])) / float(prev["Close"]) * 100
                        if float(prev["Close"]) else 0.0
                    )
                    # 종목명: pykrx가 제공하면 사용, 아니면 코드로 대체
                    display_name = name_hint
                    if not display_name:
                        try:
                            from pykrx import stock as pykrx_stock
                            display_name = pykrx_stock.get_market_ticker_name(code)
                        except Exception:
                            display_name = code
                    results.append(
                        {
                            "ticker": code,
                            "name": display_name or code,
                            "market": "kr",
                            "exchange": "KRX",
                            "current_price": float(last["Close"]),
                            "change_pct": change_pct,
                            "volume": int(last["Volume"]),
                            "market_cap": 0,
                            "currency": "KRW",
                        }
                    )
                except Exception:
                    pass
        except Exception as e:
            logger.warning("한국 주식 검색 오류: %s", e)

    return results


async def get_ohlcv(
    ticker: str, market: Literal["us", "kr"], period: str
) -> tuple[list[dict], str, str]:
    """OHLCV 캔들 데이터 반환. (candles, market_status, last_updated)"""
    yf_period = PERIOD_MAP.get(period, "1mo")
    try:
        if market == "us":
            t = yf.Ticker(ticker.upper())
            df = t.history(period=yf_period)
            status = _market_status(t)
        else:
            import FinanceDataReader as fdr

            days = KR_PERIOD_DAYS.get(period, 365)
            start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            df = fdr.DataReader(ticker, start_date)
            status = "closed"

        if df.empty:
            raise ValueError(f"{ticker} 데이터 없음")

        candles = []
        for ts, row in df.iterrows():
            date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            candles.append(
                {
                    "time": date_str,
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"]),
                }
            )

        last_updated = datetime.now(timezone.utc).isoformat()
        return candles, status, last_updated

    except Exception as e:
        logger.error("OHLCV 조회 오류 [%s/%s]: %s", ticker, market, e)
        raise


async def get_current_price(ticker: str, market: Literal["us", "kr"]) -> dict:
    """현재가 + 등락률 + 거래량 + 시가총액 반환."""
    try:
        if market == "us":
            t = yf.Ticker(ticker.upper())
            info = t.fast_info
            return {
                "current": float(getattr(info, "last_price", 0) or 0),
                "change_pct": float(getattr(info, "regular_market_previous_close", 0) or 0),
                "volume": int(getattr(info, "three_month_average_volume", 0) or 0),
                "market_cap": float(getattr(info, "market_cap", 0) or 0),
            }
        else:
            import FinanceDataReader as fdr

            df = fdr.DataReader(ticker, "2024-01-01")
            if df.empty:
                raise ValueError("데이터 없음")
            last = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else last
            change_pct = (
                (float(last["Close"]) - float(prev["Close"])) / float(prev["Close"]) * 100
                if float(prev["Close"])
                else 0.0
            )
            return {
                "current": float(last["Close"]),
                "change_pct": change_pct,
                "volume": int(last["Volume"]),
                "market_cap": 0,
            }
    except Exception as e:
        logger.error("현재가 조회 오류 [%s/%s]: %s", ticker, market, e)
        raise


async def get_market_summary() -> list[dict]:
    """미국 주요 지수 요약 반환."""
    results = []
    for name, symbol in US_INDICES.items():
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            results.append(
                {
                    "name": name,
                    "value": float(getattr(info, "last_price", 0) or 0),
                    "change_pct": 0.0,
                }
            )
        except Exception as e:
            logger.warning("지수 조회 오류 [%s]: %s", symbol, e)
            results.append({"name": name, "value": 0.0, "change_pct": 0.0})

    return [
        {
            "market": "us",
            "indices": results,
            "as_of": datetime.now(timezone.utc).isoformat(),
        }
    ]
