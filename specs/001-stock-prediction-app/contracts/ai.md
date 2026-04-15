# API Contract: AI 분석 & 챗봇

**Domain**: AI Features | **Base URL**: `/api/v1/ai`

---

## POST /api/v1/ai/analyze

AI 기술적 분석 리포트 생성 (SSE 스트리밍).

### Request Body

```json
{
  "ticker": "AAPL",
  "market": "us",
  "period": "3m"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| ticker | string | ✅ | 종목 티커 |
| market | string | | `"us"`(기본값) 또는 `"kr"` |
| period | string | | 분석 기준 기간: `"1m"`, `"3m"`(기본값), `"6m"`, `"1y"` |

### Response 200 — SSE Stream (`text/event-stream`)

스트림 이벤트 형식:

```
data: {"type": "text", "text": "## AAPL 기술적 분석\n\n"}

data: {"type": "text", "text": "현재 RSI는 58.3으로 ..."}

data: {"type": "score", "buy_score": {"short_term": {"period": "1주", "score": 72, "label": "매수 고려"}, "mid_term": {"period": "3개월", "score": 65, "label": "중립"}, "long_term": {"period": "1년", "score": 83, "label": "강력 매수"}}}

data: {"type": "disclaimer", "text": "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다."}

data: {"type": "cached", "cached_at": "2026-04-15T09:30:00Z"}

data: [DONE]
```

**이벤트 타입**:
| 타입 | 설명 | 필수 |
|------|------|------|
| `text` | 분석 텍스트 청크 (스트리밍) | ✅ |
| `score` | buy_score JSON (분석 완료 시점) | ✅ |
| `disclaimer` | 면책 고지 (항상 포함) | ✅ |
| `cached` | 캐시 응답 시 캐시 생성 시각 | 캐시 히트 시 |
| `error` | 오류 발생 시 | |

**캐시 동작**:
- 동일 (ticker, market)에 대해 10분 이내 재요청 시 캐시된 `analysis_text`를 스트리밍 없이 즉시 반환
- 캐시 응답 시 `type: "cached"` 이벤트 포함

### Response 422

```json
{
  "error": "INSUFFICIENT_DATA",
  "message": "기술 지표 계산에 필요한 데이터가 부족합니다. 최소 200일치 데이터가 필요합니다."
}
```

### Response 429

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "AI 분석 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  "retry_after": 60
}
```

### Response 503

```json
{
  "error": "AI_SERVICE_UNAVAILABLE",
  "message": "AI 분석 서비스를 일시적으로 사용할 수 없습니다."
}
```

---

## POST /api/v1/ai/chat

AI 챗봇 대화 (SSE 스트리밍).

### Request Body

```json
{
  "ticker": "AAPL",
  "market": "us",
  "message": "이 종목의 RSI가 과매수 구간인가요?"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| ticker | string | | 관련 종목 (없으면 생략) |
| market | string | | `"us"` 또는 `"kr"` |
| message | string | ✅ | 사용자 질문 |

### Response 200 — SSE Stream (`text/event-stream`)

```
data: {"type": "text", "text": "현재 AAPL의 RSI(14)는 58.3입니다. "}

data: {"type": "text", "text": "RSI 70 이상이 과매수 구간이므로, 현재는 중립 영역입니다."}

data: {"type": "disclaimer", "text": "본 내용은 AI 참고 자료이며 투자 조언이 아닙니다."}

data: [DONE]
```

### Response 400 — 범위 외 질문

```
data: {"type": "out_of_scope", "text": "주식 분석 관련 질문만 답변 가능합니다. 종목 분석, 기술 지표, 시장 동향 등에 대해 질문해 주세요."}

data: [DONE]
```

### Response 429

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  "retry_after": 60
}
```
