# Data Model: AI 기반 주가 예측 웹 애플리케이션

**Phase 1 Output** | **Date**: 2026-04-15 | **Plan**: [plan.md](./plan.md)

---

## 엔티티 관계 개요

```
User (1) ──────< Watchlist (N)
                     │
                     └── ticker (FK 아님, 외부 데이터)

Watchlist (N) ──────< AnalysisCache (1 per ticker+market)
                           │
                           └── buy_score_short / mid / long
```

> `Stock` 엔티티는 외부 데이터 소스(yfinance, FDR)에서 실시간으로 조회하므로 DB에 저장하지 않는다.
> `TechnicalIndicators`도 요청 시 계산 후 캐시에 스냅샷으로만 저장한다.

---

## 테이블 정의

### users

사용자 계정 정보.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 사용자 고유 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 로그인 이메일 |
| hashed_password | VARCHAR(255) | NOT NULL | bcrypt 해시 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 계정 활성 여부 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 가입일시 |

**인덱스**: `email` (UNIQUE)

**비즈니스 규칙**:
- 이메일은 소문자 정규화 후 저장
- 비밀번호는 평문 저장 금지 (bcrypt 해시만 저장)
- `is_active = false`는 계정 비활성화 (삭제 대신 소프트 비활성화)

---

### watchlist

사용자별 관심 종목 목록.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 레코드 ID |
| user_id | UUID | FK → users.id, NOT NULL | 소유 사용자 |
| ticker | VARCHAR(20) | NOT NULL | 종목 티커 (예: AAPL, 005930) |
| market | VARCHAR(5) | NOT NULL, CHECK(market IN ('us','kr')) | 시장 구분 |
| display_name | VARCHAR(100) | NOT NULL | 종목명 (검색 시 저장) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 등록일시 |

**인덱스**: `(user_id, ticker, market)` UNIQUE

**비즈니스 규칙**:
- 사용자당 최대 30개 제한 (INSERT 전 COUNT 검증)
- 동일 (user_id, ticker, market) 조합은 중복 불가
- 삭제 시 물리 삭제 (소프트 삭제 불필요)

---

### analysis_cache

AI 분석 결과 캐시 (종목+시장 단위, 사용자 무관).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 레코드 ID |
| ticker | VARCHAR(20) | NOT NULL | 종목 티커 |
| market | VARCHAR(5) | NOT NULL | 시장 구분 (us/kr) |
| analysis_text | TEXT | NOT NULL | Claude 전체 분석 텍스트 |
| indicators_snapshot | JSONB | NOT NULL | 분석에 사용된 기술 지표 수치 스냅샷 |
| global_events_summary | TEXT | | Claude web_search로 수집된 이벤트 요약 |
| buy_score_short | SMALLINT | CHECK(0–100) | 단기(1주) 예측 점수 |
| buy_score_short_label | VARCHAR(20) | | 단기 점수 라벨 |
| buy_score_mid | SMALLINT | CHECK(0–100) | 중기(3개월) 예측 점수 |
| buy_score_mid_label | VARCHAR(20) | | 중기 점수 라벨 |
| buy_score_long | SMALLINT | CHECK(0–100) | 장기(1년) 예측 점수 |
| buy_score_long_label | VARCHAR(20) | | 장기 점수 라벨 |
| score_rationale | TEXT | | 점수 산출 근거 요약 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 분석 생성일시 |
| expires_at | TIMESTAMPTZ | NOT NULL | 캐시 만료일시 (created_at + 10분) |

**인덱스**:
- `(ticker, market, expires_at)` — 유효 캐시 조회용
- `expires_at` — 만료 레코드 정리(cleanup)용

**비즈니스 규칙**:
- 조회 시 `expires_at > now()` 조건으로 유효성 검사
- 만료된 레코드는 주기적으로 삭제 (또는 조회 시 무효화)
- `buy_score_*`가 NULL이면 점수 파싱 실패를 의미 (분석 텍스트는 있음)
- 동일 (ticker, market)에 여러 캐시 레코드 존재 가능 → 가장 최신의 유효한 레코드 사용

---

### chat_messages

챗봇 대화 이력.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 메시지 ID |
| user_id | UUID | FK → users.id, NULL 허용 | 사용자 (비로그인 NULL) |
| ticker | VARCHAR(20) | NULL 허용 | 관련 종목 (없으면 NULL) |
| market | VARCHAR(5) | NULL 허용 | 시장 구분 |
| question | TEXT | NOT NULL | 사용자 질문 |
| answer | TEXT | | AI 응답 (스트리밍 완료 후 저장) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성일시 |

**인덱스**: `(user_id, created_at DESC)` — 사용자별 최근 대화 조회

**비즈니스 규칙**:
- 비로그인 사용자는 `user_id = NULL`로 저장 (이력 조회 불가)
- 응답 스트리밍 시작 시 `question`만 먼저 저장, 완료 후 `answer` 업데이트
- 챗봇 이력은 최근 50개까지만 조회 제공 (UI 무한 스크롤 방지)

---

## indicators_snapshot JSONB 스키마

`analysis_cache.indicators_snapshot` 컬럼에 저장되는 JSON 구조:

```json
{
  "ticker": "AAPL",
  "market": "us",
  "period": "3m",
  "as_of": "2026-04-15T00:00:00Z",
  "price": {
    "current": 195.50,
    "change_pct": -1.2,
    "volume": 58234100,
    "market_cap": 3010000000000
  },
  "sma": {
    "sma5": 193.20,
    "sma20": 189.45,
    "sma50": 185.30,
    "sma200": 178.90
  },
  "rsi": {
    "rsi14": 58.3
  },
  "macd": {
    "macd": 2.15,
    "signal": 1.80,
    "histogram": 0.35
  },
  "bollinger": {
    "upper": 201.20,
    "middle": 189.45,
    "lower": 177.70
  },
  "stochastic": {
    "k": 72.4,
    "d": 68.1
  }
}
```

---

## buy_score JSON 구조 (Claude 응답에서 파싱)

```json
{
  "buy_score": {
    "short_term": {
      "period": "1주",
      "score": 72,
      "label": "매수 고려"
    },
    "mid_term": {
      "period": "3개월",
      "score": 65,
      "label": "중립"
    },
    "long_term": {
      "period": "1년",
      "score": 83,
      "label": "강력 매수"
    }
  }
}
```

**점수 라벨 매핑**:
| 범위 | 라벨 | 색상 |
|------|------|------|
| 0–20 | 강력 매도 | 빨강 (#EF4444) |
| 21–40 | 매도 고려 | 주황 (#F97316) |
| 41–60 | 중립 | 노랑 (#EAB308) |
| 61–80 | 매수 고려 | 연두 (#84CC16) |
| 81–100 | 강력 매수 | 초록 (#22C55E) |

---

## 데이터 흐름 요약

```
[사용자 요청]
    │
    ▼
[FastAPI] → analysis_cache 유효 캐시 조회
    │ 캐시 히트 ────────────────────► [SSE: cached 응답 반환]
    │ 캐시 미스
    ▼
[market_data.py] → yfinance/FDR로 OHLCV 수집
    │
    ▼
[indicators.py] → pandas_ta로 지표 계산 → indicators_snapshot 생성
    │
    ▼
[claude.py] → Claude API 호출 (web_search + indicators_snapshot)
    │
    ├──► SSE 스트리밍 → [프론트엔드에 실시간 전달]
    │
    ▼
[score_parser.py] → buy_score JSON 파싱
    │
    ▼
[cache.py] → analysis_cache INSERT (expires_at = now() + 10min)
```
