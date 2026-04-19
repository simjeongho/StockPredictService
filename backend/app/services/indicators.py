"""pandas_ta를 이용한 기술 지표 계산 서비스."""
import logging
from datetime import timezone, datetime
from typing import Literal

import pandas as pd
import pandas_ta_classic as ta

logger = logging.getLogger(__name__)

MIN_CANDLES = 200  # SMA 200 계산에 필요한 최소 데이터


def calculate_all(df: pd.DataFrame) -> dict:
    """
    DataFrame(OHLCV)에서 모든 기술 지표 계산.

    Raises:
        ValueError: 데이터가 MIN_CANDLES(200)개 미만인 경우
    """
    if len(df) < MIN_CANDLES:
        raise ValueError(
            f"기술 지표 계산에 필요한 최소 {MIN_CANDLES}개 거래일치 데이터가 부족합니다. "
            f"현재 {len(df)}개."
        )

    # NaN 처리
    df = df.dropna(subset=["Close", "High", "Low", "Open", "Volume"])

    def safe_float(val) -> float | None:
        try:
            f = float(val)
            return None if pd.isna(f) else round(f, 4)
        except (TypeError, ValueError):
            return None

    # SMA
    sma5 = df.ta.sma(length=5)
    sma20 = df.ta.sma(length=20)
    sma50 = df.ta.sma(length=50)
    sma200 = df.ta.sma(length=200)

    # RSI
    rsi = df.ta.rsi(length=14)

    # MACD (12, 26, 9)
    macd_df = df.ta.macd(fast=12, slow=26, signal=9)

    # 볼린저 밴드 (20, 2σ)
    bb_df = df.ta.bbands(length=20, std=2)

    # 스토캐스틱 (14, 3, 3)
    stoch_df = df.ta.stoch(k=14, d=3, smooth_k=3)

    last_idx = -1

    return {
        "sma": {
            "sma5": safe_float(sma5.iloc[last_idx]) if sma5 is not None else None,
            "sma20": safe_float(sma20.iloc[last_idx]) if sma20 is not None else None,
            "sma50": safe_float(sma50.iloc[last_idx]) if sma50 is not None else None,
            "sma200": safe_float(sma200.iloc[last_idx]) if sma200 is not None else None,
        },
        "rsi": {
            "rsi14": safe_float(rsi.iloc[last_idx]) if rsi is not None else None,
        },
        "macd": {
            "macd": safe_float(macd_df["MACD_12_26_9"].iloc[last_idx]) if macd_df is not None else None,
            "signal": safe_float(macd_df["MACDs_12_26_9"].iloc[last_idx]) if macd_df is not None else None,
            "histogram": safe_float(macd_df["MACDh_12_26_9"].iloc[last_idx]) if macd_df is not None else None,
        },
        "bollinger": {
            "upper": safe_float(bb_df["BBU_20_2.0"].iloc[last_idx]) if bb_df is not None else None,
            "middle": safe_float(bb_df["BBM_20_2.0"].iloc[last_idx]) if bb_df is not None else None,
            "lower": safe_float(bb_df["BBL_20_2.0"].iloc[last_idx]) if bb_df is not None else None,
        },
        "stochastic": {
            "k": safe_float(stoch_df["STOCHk_14_3_3"].iloc[last_idx]) if stoch_df is not None else None,
            "d": safe_float(stoch_df["STOCHd_14_3_3"].iloc[last_idx]) if stoch_df is not None else None,
        },
    }


async def get_indicators_snapshot(
    ticker: str, market: Literal["us", "kr"]
) -> dict:
    """ticker에 대한 전체 지표 스냅샷 반환."""
    import yfinance as yf
    from datetime import datetime

    if market == "us":
        t = yf.Ticker(ticker.upper())
        df = t.history(period="2y")
        info = t.fast_info
        current_price = float(getattr(info, "last_price", 0) or 0)
        change_pct = 0.0
        volume = int(getattr(info, "three_month_average_volume", 0) or 0)
        market_cap = float(getattr(info, "market_cap", 0) or 0)
    else:
        import FinanceDataReader as fdr

        df = fdr.DataReader(ticker, "2022-01-01")
        if df.empty:
            raise ValueError(f"{ticker} 데이터 없음")
        last = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else last
        current_price = float(last["Close"])
        change_pct = (
            (float(last["Close"]) - float(prev["Close"])) / float(prev["Close"]) * 100
            if float(prev["Close"])
            else 0.0
        )
        volume = int(last["Volume"])
        market_cap = 0

    indicators = calculate_all(df)

    return {
        "ticker": ticker,
        "market": market,
        "period": "2y",
        "as_of": datetime.now(timezone.utc).isoformat(),
        "price": {
            "current": current_price,
            "change_pct": change_pct,
            "volume": volume,
            "market_cap": market_cap,
        },
        **indicators,
    }
