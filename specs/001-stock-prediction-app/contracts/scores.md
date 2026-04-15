# API Contract: 예측 점수

**Domain**: Prediction Scores | **Base URL**: `/api/v1/stocks` & `/api/v1/scores`

---

## GET /api/v1/stocks/{ticker}/score

특정 종목의 최신 예측 점수 조회.

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
  "analyzed_at": "2026-04-15T09:30:00Z",
  "expires_at": "2026-04-15T09:40:00Z",
  "buy_score": {
    "short_term": {
      "period": "1주",
      "score": 72,
      "label": "매수 고려",
      "color": "#84CC16"
    },
    "mid_term": {
      "period": "3개월",
      "score": 65,
      "label": "중립",
      "color": "#EAB308"
    },
    "long_term": {
      "period": "1년",
      "score": 83,
      "label": "강력 매수",
      "color": "#22C55E"
    }
  },
  "score_rationale": "RSI(58.3) 중립 구간, MACD 골든크로스 진행 중. 단기 글로벌 이벤트(미연준 금리 결정) 불확실성으로 단기 점수 조정."
}
```

### Response 404 — 아직 분석 이력 없음

```json
{
  "error": "NO_SCORE_AVAILABLE",
  "message": "아직 분석된 점수가 없습니다. AI 분석을 먼저 실행해 주세요."
}
```

---

## GET /api/v1/scores/ranking

분석 완료된 종목들의 예측 점수 랭킹 조회. 관심 종목 비교 화면에서 사용.

**Authentication**: JWT 인증 필요 (관심 종목 기준으로 필터링)

### Request

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|----------|------|------|------|------|
| market | query | string | | `us`(기본값), `kr` |
| sort | query | string | | `short`(기본값), `mid`, `long`, `total` |
| watchlist_only | query | boolean | | `true`이면 관심 종목만 반환 (인증 필요) |

### Response 200

```json
{
  "market": "us",
  "sort_by": "short",
  "as_of": "2026-04-15T09:30:00Z",
  "items": [
    {
      "ticker": "NVDA",
      "display_name": "NVIDIA Corporation",
      "market": "us",
      "current_price": 875.30,
      "change_pct": 2.14,
      "buy_score": {
        "short_term": { "score": 88, "label": "강력 매수", "color": "#22C55E" },
        "mid_term": { "score": 82, "label": "강력 매수", "color": "#22C55E" },
        "long_term": { "score": 79, "label": "매수 고려", "color": "#84CC16" }
      },
      "total_score": 83,
      "analyzed_at": "2026-04-15T09:20:00Z",
      "in_watchlist": true
    },
    {
      "ticker": "AAPL",
      "display_name": "Apple Inc.",
      "market": "us",
      "current_price": 195.50,
      "change_pct": -1.23,
      "buy_score": {
        "short_term": { "score": 72, "label": "매수 고려", "color": "#84CC16" },
        "mid_term": { "score": 65, "label": "중립", "color": "#EAB308" },
        "long_term": { "score": 83, "label": "강력 매수", "color": "#22C55E" }
      },
      "total_score": 73,
      "analyzed_at": "2026-04-15T09:30:00Z",
      "in_watchlist": true
    }
  ],
  "total": 2,
  "disclaimer": "본 점수는 AI 예측 참고용이며, 투자 결정의 책임은 사용자에게 있습니다."
}
```

**`total_score`**: `(short_term.score + mid_term.score + long_term.score) / 3` 단순 평균 (소수점 반올림)

**`disclaimer`**: 응답에 항상 포함 (FR-017, SC-005)

### Response 204 — 분석된 관심 종목 없음

```json
{
  "error": "NO_DATA",
  "message": "관심 종목에 분석된 점수가 없습니다. 종목 상세 화면에서 AI 분석을 먼저 실행해 주세요."
}
```
