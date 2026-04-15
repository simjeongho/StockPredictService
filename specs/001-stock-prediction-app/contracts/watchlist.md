# API Contract: 관심 종목

**Domain**: Watchlist Management | **Base URL**: `/api/v1/watchlist`
**Authentication**: 모든 엔드포인트 JWT 인증 필요 (`Authorization: Bearer <token>`)

---

## GET /api/v1/watchlist

사용자의 관심 종목 목록 조회.

### Response 200

```json
{
  "items": [
    {
      "id": "uuid-1",
      "ticker": "AAPL",
      "market": "us",
      "display_name": "Apple Inc.",
      "current_price": 195.50,
      "change_pct": -1.23,
      "volume": 58234100,
      "added_at": "2026-04-10T08:00:00Z"
    },
    {
      "id": "uuid-2",
      "ticker": "005930",
      "market": "kr",
      "display_name": "삼성전자",
      "current_price": 71500,
      "change_pct": 0.70,
      "volume": 12340000,
      "added_at": "2026-04-12T14:30:00Z"
    }
  ],
  "total": 2,
  "limit": 30
}
```

**`current_price`, `change_pct`, `volume`**: 조회 시점의 실시간(또는 최신) 데이터. 장 마감 시 마지막 종가.

---

## POST /api/v1/watchlist

관심 종목 추가.

### Request Body

```json
{
  "ticker": "TSLA",
  "market": "us",
  "display_name": "Tesla, Inc."
}
```

### Response 201

```json
{
  "id": "uuid-3",
  "ticker": "TSLA",
  "market": "us",
  "display_name": "Tesla, Inc.",
  "added_at": "2026-04-15T10:00:00Z"
}
```

### Response 409 — 이미 등록된 종목

```json
{
  "error": "ALREADY_EXISTS",
  "message": "이미 관심 종목으로 등록된 종목입니다."
}
```

### Response 422 — 최대 개수 초과

```json
{
  "error": "WATCHLIST_LIMIT_EXCEEDED",
  "message": "관심 종목은 최대 30개까지 등록할 수 있습니다.",
  "current_count": 30,
  "limit": 30
}
```

---

## DELETE /api/v1/watchlist/{ticker}

관심 종목 삭제.

### Request

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|----------|------|------|------|------|
| ticker | path | string | ✅ | 삭제할 종목 티커 |
| market | query | string | | `us`(기본값), `kr` |

**Example**: `DELETE /api/v1/watchlist/TSLA?market=us`

### Response 204

응답 본문 없음.

### Response 404

```json
{
  "error": "NOT_FOUND",
  "message": "관심 종목 목록에 해당 종목이 없습니다."
}
```

---

## 인증 실패 공통 응답

### Response 401

```json
{
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요한 기능입니다."
}
```
