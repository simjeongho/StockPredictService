# API Contract: 주가 데이터

**Domain**: Stock Market Data | **Base URL**: `/api/v1/stocks`

---

## GET /api/v1/stocks/search

종목명 또는 티커 심볼로 주식 검색.

### Request

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|----------|------|------|------|------|
| q | query | string | ✅ | 검색어 (종목명 또는 티커) |
| market | query | string | | 시장 필터: `us`(기본값) 또는 `kr` |

**Example**: `GET /api/v1/stocks/search?q=AAPL&market=us`

### Response 200

```json
{
  "results": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "market": "us",
      "exchange": "NASDAQ",
      "current_price": 195.50,
      "change_pct": -1.23,
      "currency": "USD"
    }
  ],
  "total": 1
}
```

### Response 400

```json
{ "error": "INVALID_QUERY", "message": "검색어를 입력해 주세요." }
```

### Response 404

```json
{ "error": "NOT_FOUND", "message": "해당 종목을 찾을 수 없습니다." }
```

### Response 503

```json
{
  "error": "DATA_SOURCE_UNAVAILABLE",
  "message": "시장 데이터를 일시적으로 불러올 수 없습니다.",
  "last_available": "2026-04-15T09:30:00Z"
}
```

---

## GET /api/v1/stocks/{ticker}/price

주가 OHLCV 이력 데이터 조회.

### Request

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|----------|------|------|------|------|
| ticker | path | string | ✅ | 종목 티커 |
| period | query | string | | `1m`(기본값), `3m`, `6m`, `1y` |
| market | query | string | | `us`(기본값), `kr` |

**Example**: `GET /api/v1/stocks/AAPL/price?period=3m&market=us`

### Response 200

```json
{
  "ticker": "AAPL",
  "market": "us",
  "period": "3m",
  "currency": "USD",
  "is_realtime": false,
  "last_updated": "2026-04-15T16:00:00Z",
  "current": {
    "price": 195.50,
    "change": -2.44,
    "change_pct": -1.23,
    "volume": 58234100,
    "market_cap": 3010000000000,
    "market_status": "closed"
  },
  "candles": [
    {
      "date": "2026-01-15",
      "open": 188.20,
      "high": 191.50,
      "low": 187.10,
      "close": 190.30,
      "volume": 45123000
    }
  ]
}
```

**`market_status`**: `"open"` | `"closed"` | `"pre-market"` | `"after-hours"`

### Response 404

```json
{ "error": "TICKER_NOT_FOUND", "message": "존재하지 않는 종목입니다: XXXXXX" }
```

### Response 422

```json
{ "error": "INSUFFICIENT_DATA", "message": "해당 종목의 이력 데이터가 충분하지 않습니다 (신규 상장 등)." }
```

---

## GET /api/v1/stocks/{ticker}/indicators

기술 지표 현재값 조회.

### Request

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|----------|------|------|------|------|
| ticker | path | string | ✅ | 종목 티커 |
| market | query | string | | `us`(기본값), `kr` |

### Response 200

```json
{
  "ticker": "AAPL",
  "market": "us",
  "as_of": "2026-04-15T00:00:00Z",
  "sma": { "sma5": 193.20, "sma20": 189.45, "sma50": 185.30, "sma200": 178.90 },
  "rsi": { "rsi14": 58.3 },
  "macd": { "macd": 2.15, "signal": 1.80, "histogram": 0.35 },
  "bollinger": { "upper": 201.20, "middle": 189.45, "lower": 177.70 },
  "stochastic": { "k": 72.4, "d": 68.1 }
}
```

---

## GET /api/v1/stocks/market/summary

시장 전체 요약 (인덱스 현황).

### Request

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|----------|------|------|------|------|
| market | query | string | | `us`(기본값), `kr` |

### Response 200

```json
{
  "market": "us",
  "last_updated": "2026-04-15T16:00:00Z",
  "indices": [
    { "name": "S&P 500", "ticker": "^GSPC", "value": 5123.45, "change_pct": -0.45 },
    { "name": "NASDAQ", "ticker": "^IXIC", "value": 16234.10, "change_pct": -0.82 },
    { "name": "DOW", "ticker": "^DJI", "value": 38901.20, "change_pct": -0.21 }
  ]
}
```
