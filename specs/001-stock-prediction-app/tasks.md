---
description: "Task list for AI 기반 주가 예측 웹 애플리케이션"
---

# Tasks: AI 기반 주가 예측 웹 애플리케이션

**Input**: Design documents from `/specs/001-stock-prediction-app/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, research.md ✅, quickstart.md ✅

**Tests**: 스펙에서 TDD를 명시적으로 요청하지 않았으므로 테스트 태스크는 포함하지 않음.

**Organization**: 5개 사용자 스토리(US1–US5)별로 구성. 각 스토리는 독립적으로 구현·테스트·배포 가능.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 다른 파일을 다루며 의존성 없이 병렬 실행 가능
- **[Story]**: 해당 태스크가 속한 사용자 스토리 (US1, US2, ...)
- 모든 태스크에 정확한 파일 경로 포함

## Path Conventions

- Backend: `backend/app/`, `backend/alembic/`, `backend/tests/`
- Frontend: `frontend/src/app/`, `frontend/src/components/`, `frontend/src/services/`, `frontend/src/types/`

---

## Phase 1: Setup (프로젝트 초기화)

**Purpose**: 백엔드/프론트엔드 프로젝트 기반 파일 생성 및 설정

- [ ] T001 Create backend directory structure: `backend/app/models/`, `backend/app/schemas/`, `backend/app/routers/`, `backend/app/services/`, `backend/alembic/versions/`, `backend/tests/`
- [ ] T002 [P] Create frontend directory structure: `frontend/src/app/`, `frontend/src/components/`, `frontend/src/services/`, `frontend/src/types/`, `frontend/public/`
- [ ] T003 [P] Create `backend/requirements.txt` with all Python dependencies: fastapi, uvicorn[standard], anthropic, yfinance, financedatareader, pandas, pandas-ta, sqlalchemy[asyncio], asyncpg, alembic, slowapi, python-jose[cryptography], passlib[bcrypt], httpx, python-dotenv, pydantic-settings
- [ ] T004 [P] Create `frontend/package.json` with all JS dependencies: next@14, react, typescript, tailwindcss, lightweight-charts, axios
- [ ] T005 [P] Create `backend/.env.example` with all required environment variables: DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES, CORS_ORIGINS, RATE_LIMIT_PER_MINUTE, AI_RATE_LIMIT_PER_MINUTE, ANALYSIS_CACHE_TTL_SECONDS
- [ ] T006 [P] Create `frontend/.env.local.example` with NEXT_PUBLIC_API_BASE_URL
- [ ] T007 [P] Create `backend/Dockerfile` with multi-stage build: builder stage (pip install) + runtime stage (uvicorn CMD, EXPOSE 8000, HEALTHCHECK)
- [ ] T008 [P] Create `frontend/next.config.ts` (App Router enabled) and `frontend/tailwind.config.ts` (content paths configured)
- [ ] T009 [P] Create `frontend/tsconfig.json` with strict TypeScript settings and path aliases (`@/*` → `./src/*`)

---

## Phase 2: Foundational (모든 사용자 스토리의 공통 기반)

**Purpose**: FastAPI 앱 골격, 데이터베이스 설정, ORM 모델, 마이그레이션, Next.js 레이아웃

**⚠️ CRITICAL**: 이 Phase가 완료되어야 모든 사용자 스토리 구현 시작 가능

- [ ] T010 Create `backend/app/config.py` — pydantic-settings `Settings` 클래스: DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET_KEY, CORS_ORIGINS, RATE_LIMIT_PER_MINUTE, AI_RATE_LIMIT_PER_MINUTE, ANALYSIS_CACHE_TTL_SECONDS
- [ ] T011 Create `backend/app/database.py` — SQLAlchemy 2.x async engine (`create_async_engine`), `AsyncSessionLocal` 팩토리, `get_db` 의존성 주입 함수
- [ ] T012 [P] Create `backend/app/models/user.py` — User ORM 모델: id(UUID PK), email(UNIQUE), hashed_password, is_active, created_at
- [ ] T013 [P] Create `backend/app/models/watchlist.py` — Watchlist ORM 모델: id(UUID PK), user_id(FK→users), ticker, market, display_name, created_at; UNIQUE constraint on (user_id, ticker, market)
- [ ] T014 [P] Create `backend/app/models/analysis_cache.py` — AnalysisCache ORM 모델: id(UUID PK), ticker, market, analysis_text, indicators_snapshot(JSONB), global_events_summary, buy_score_short/mid/long(SMALLINT), score_rationale, created_at, expires_at; index on (ticker, market, expires_at)
- [ ] T015 [P] Create `backend/app/models/chat_message.py` — ChatMessage ORM 모델: id(UUID PK), user_id(FK→users, nullable), ticker(nullable), market(nullable), question, answer(nullable), created_at
- [ ] T016 Configure `backend/alembic.ini` and `backend/alembic/env.py` — async SQLAlchemy support, import all models for autogenerate
- [ ] T017 Generate initial Alembic migration in `backend/alembic/versions/` — create tables: users, watchlist, analysis_cache, chat_messages
- [ ] T018 Create `backend/app/routers/health.py` — GET /health: return `{"status": "ok", "db": "connected", "timestamp": "..."}` with async DB ping
- [ ] T019 Create `backend/app/main.py` — FastAPI app, CORSMiddleware (CORS_ORIGINS from config), register routers (health), global exception handler returning `{"error": CODE, "message": MSG}` format
- [ ] T020 Create `frontend/src/types/index.ts` — TypeScript 인터페이스 정의: StockSearchResult, PriceData, Candle, IndicatorsData, BuyScore, AnalysisResult, WatchlistItem, ChatMessage, ScoreRankingItem
- [ ] T021 [P] Create `frontend/src/services/api.ts` — Axios 인스턴스 (baseURL=NEXT_PUBLIC_API_BASE_URL, Authorization Bearer 헤더 자동 주입), 기본 API 함수 스텁(searchStocks, getPrice, getIndicators, analyze, chat, getWatchlist, addWatchlist, removeWatchlist, getScoreRanking)
- [ ] T022 [P] Create `frontend/src/components/Disclaimer.tsx` — 면책 고지 컴포넌트: "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다." (항상 표시)
- [ ] T023 Create `frontend/src/app/layout.tsx` — 루트 레이아웃: 네비게이션 바 (메인/종목검색/관심종목/점수비교/챗봇), Tailwind CSS 적용, 반응형 헤더

**Checkpoint**: `uvicorn app.main:app --reload` 실행 → GET /health 응답 정상. Next.js `npm run dev` 실행 → http://localhost:3000 레이아웃 확인.

---

## Phase 3: User Story 1 - 종목 검색 및 대시보드 (Priority: P1) 🎯 MVP

**Goal**: 종목명/티커로 검색, 현재가/등락률/거래량 표시, 1M/3M/6M/1Y 주가 차트 조회

**Independent Test**: 로그인 없이 "AAPL" 검색 → 현재가·차트 표시. `GET /api/v1/stocks/search?q=AAPL` 및 `GET /api/v1/stocks/AAPL/price?period=1m` 응답 확인.

### Backend — User Story 1

- [ ] T024 [P] [US1] Create `backend/app/schemas/stock.py` — Pydantic 스키마: StockSearchResult, PriceResponse(candles 배열 포함), IndicatorsResponse, MarketSummaryResponse; market_status 필드 포함
- [ ] T025 [US1] Implement `backend/app/services/market_data.py` — yfinance(미국) + FinanceDataReader(한국) 통합 서비스: search_stock(), get_ohlcv(ticker, market, period), get_current_price(), get_market_summary(); 데이터 없을 시 503 예외 발생, 타임스탬프 포함
- [ ] T026 [US1] Implement `backend/app/services/indicators.py` — pandas_ta 기술 지표 계산: calculate_all(df) → SMA(5,20,50,200), RSI(14), MACD(12,26,9), 볼린저밴드(20,2σ), 스토캐스틱(14,3,3); 최소 데이터 200개 미만 시 ValueError 발생; NaN 처리 포함
- [ ] T027 [US1] Create `backend/app/routers/stocks.py` — 4개 엔드포인트 구현: GET /search, GET /{ticker}/price, GET /{ticker}/indicators, GET /market/summary; market_data·indicators 서비스 호출; contracts/stocks.md 계약 준수; main.py에 라우터 등록

### Frontend — User Story 1

- [ ] T028 [P] [US1] Create `frontend/src/components/StockChart.tsx` — Lightweight Charts 래퍼: candles 배열 props 수신, 캔들스틱 차트 렌더링, 반응형(컨테이너 너비 100%), 모바일 375px 이상 정상 표시
- [ ] T029 [US1] Create `frontend/src/app/page.tsx` — 메인 대시보드: 종목 검색창(입력+버튼), 시장 요약(S&P500, NASDAQ, DOW 인덱스 카드), 검색 결과 리스트; API searchStocks() + getMarketSummary() 호출
- [ ] T030 [US1] Create `frontend/src/app/stock/[ticker]/page.tsx` — 종목 상세 페이지: 현재가·등락률·거래량·시가총액 헤더, 1M/3M/6M/1Y 탭으로 StockChart 전환, 기술 지표 수치 표시(RSI·MACD·볼린저밴드 등), Disclaimer 컴포넌트 포함

**Checkpoint**: User Story 1 독립 완료 — 브라우저에서 http://localhost:3000 → AAPL 검색 → 차트·지표 표시 확인. quickstart.md P1 체크리스트 통과.

---

## Phase 4: User Story 2 - AI 기술적 분석 리포트 (Priority: P2)

**Goal**: AI가 기술 지표 데이터 기반으로 단기(1주)/중기(1개월) 분석 리포트 + 예측 점수를 SSE 스트리밍으로 제공

**Independent Test**: 종목 상세 화면 → "AI 분석" 버튼 → 1분 이내 SSE 스트리밍 텍스트·점수 수신. `POST /api/v1/ai/analyze {"ticker":"AAPL","market":"us"}` curl로 SSE 이벤트 확인.

### Backend — User Story 2

- [ ] T031 [P] [US2] Create `backend/app/schemas/analysis.py` — Pydantic 스키마: AnalyzeRequest(ticker, market, period), BuyScoreTerm(period, score, label), BuyScore(short_term, mid_term, long_term), AnalyzeEventChunk(type, text/score/disclaimer/cached)
- [ ] T032 [US2] Implement `backend/app/services/score_parser.py` — Claude 응답 전체 텍스트에서 buy_score JSON 블록 정규식 추출: extract_buy_score(text) → dict | None; 파싱 실패 시 None 반환
- [ ] T033 [US2] Implement `backend/app/services/cache.py` — PostgreSQL analysis_cache TTL 캐싱: get_valid_cache(ticker, market) → 유효 캐시 조회(expires_at > now()), save_cache(ticker, market, analysis_text, indicators_snapshot, buy_score) → INSERT with expires_at=now()+TTL
- [ ] T034 [US2] Implement `backend/app/services/claude.py` — Claude API SSE 스트리밍 서비스: stream_analysis(ticker, market, indicators) async generator; model=claude-sonnet-4-20250514, tools=[web_search_20250305], 시스템 프롬프트(역할+지시+buy_score JSON 형식+점수 기준+면책 고지), 기술 지표 JSON 컨텍스트 포함; 타임아웃 60초; 재시도 2회
- [ ] T035 [US2] Create `backend/app/routers/ai.py` — POST /api/v1/ai/analyze: 캐시 확인 → 캐시 미스 시 market_data+indicators 계산 → claude.py 스트리밍 → score_parser로 buy_score 추출 → cache.py 저장; StreamingResponse(text/event-stream) 반환; slowapi rate limit 분당 5회; contracts/ai.md 계약 준수; main.py에 라우터 등록

### Frontend — User Story 2

- [ ] T036 [P] [US2] Create `frontend/src/components/ScoreGauge.tsx` — 예측 점수 게이지 컴포넌트: score(0-100) props 수신, 색상 코딩(0~20 #EF4444, 21~40 #F97316, 41~60 #EAB308, 61~80 #84CC16, 81~100 #22C55E), 라벨(강력 매도~강력 매수), 단기/중기/장기 3개 게이지 표시
- [ ] T037 [US2] Update `frontend/src/app/stock/[ticker]/page.tsx` — AI 분석 섹션 추가: "AI 분석 요청" 버튼, SSE fetch로 텍스트 스트리밍 표시(data: 이벤트 파싱), score 이벤트 수신 시 ScoreGauge 렌더링, disclaimer 이벤트 수신 시 Disclaimer 표시, 캐시 응답 시 "X분 전 분석" 배지 표시

**Checkpoint**: User Story 2 독립 완료 — 종목 상세 → AI 분석 버튼 → 텍스트 스트리밍 + 점수 게이지 + 면책 고지 확인.

---

## Phase 5: User Story 3 - 관심 종목 관리 (Priority: P3)

**Goal**: 로그인한 사용자가 관심 종목 등록/해제, 관심 종목 요약 화면에서 모든 종목 현황 조회

**Independent Test**: 로그인 후 AAPL 관심 종목 추가 → GET /api/v1/watchlist에서 조회 → 관심 종목 화면에서 현재가 표시.

### Backend — User Story 3

- [ ] T038 [P] [US3] Create `backend/app/schemas/watchlist.py` — Pydantic 스키마: WatchlistAddRequest(ticker, market, display_name), WatchlistItem(id, ticker, market, display_name, current_price, change_pct, volume, added_at), WatchlistResponse(items, total, limit)
- [ ] T039 [US3] Implement `backend/app/services/auth.py` — JWT 인증 서비스: create_access_token(), verify_token(), get_password_hash(), verify_password(), get_current_user() 의존성; python-jose + passlib[bcrypt] 사용
- [ ] T040 [US3] Create `backend/app/routers/auth.py` — POST /api/v1/auth/register(이메일+비밀번호 등록), POST /api/v1/auth/login(JWT 반환); User 모델 DB 저장; main.py에 라우터 등록
- [ ] T041 [US3] Create `backend/app/routers/watchlist.py` — 3개 엔드포인트: GET /api/v1/watchlist(목록+현재가 조회), POST /api/v1/watchlist(추가, 30개 제한 검증, 중복 방지), DELETE /api/v1/watchlist/{ticker}(삭제); get_current_user 의존성으로 인증; contracts/watchlist.md 계약 준수; main.py에 라우터 등록

### Frontend — User Story 3

- [ ] T042 [P] [US3] Create `frontend/src/components/WatchlistCard.tsx` — 관심 종목 카드: ticker, display_name, current_price, change_pct, volume 표시; 등락률 색상(양수 초록, 음수 빨강)
- [ ] T043 [US3] Create `frontend/src/app/watchlist/page.tsx` — 관심 종목 관리 페이지: 비로그인 시 로그인 안내, 로그인 시 WatchlistCard 목록 표시, 개별 종목 삭제 버튼; getWatchlist() API 호출
- [ ] T044 [US3] Update `frontend/src/app/stock/[ticker]/page.tsx` — 관심 종목 추가/해제 버튼 추가: 로그인 상태 확인, addWatchlist()/removeWatchlist() API 호출, 버튼 상태 토글(추가됨/추가하기)

**Checkpoint**: User Story 3 독립 완료 — 회원가입 → 로그인 → AAPL 관심 추가 → 관심 종목 화면에서 현재가 표시 확인.

---

## Phase 6: User Story 4 - AI 챗봇 질의응답 (Priority: P4)

**Goal**: 특정 종목에 대해 자연어 질문 → Claude가 해당 종목 데이터 기반 자연어 응답 (SSE 스트리밍)

**Independent Test**: POST /api/v1/ai/chat {"ticker":"AAPL","message":"RSI가 과매수 구간인가요?"} → SSE 이벤트 수신, 주식 범위 외 질문 시 out_of_scope 이벤트 반환.

### Backend — User Story 4

- [ ] T045 [US4] Extend `backend/app/routers/ai.py` — POST /api/v1/ai/chat 엔드포인트 추가: 종목 데이터(있을 경우) 조회 → Claude 호출(web_search, 종목 컨텍스트 포함, 범위 외 질문 감지 시스템 프롬프트) → SSE 스트리밍; ChatMessage DB 저장(question 즉시, answer 완료 후); contracts/ai.md 계약 준수; slowapi rate limit 분당 10회

### Frontend — User Story 4

- [ ] T046 [P] [US4] Create `frontend/src/components/ChatInterface.tsx` — 챗봇 UI 컴포넌트: 메시지 목록(사용자/AI 말풍선), 입력창+전송 버튼, SSE 스트리밍 텍스트 실시간 표시(타이핑 인디케이터), out_of_scope 이벤트 처리, disclaimer 이벤트 처리, 모바일 반응형
- [ ] T047 [US4] Create `frontend/src/app/chat/page.tsx` — 챗봇 페이지: 상단 종목 선택(선택적), ChatInterface 컴포넌트 렌더링, 페이지 하단 Disclaimer 표시

**Checkpoint**: User Story 4 독립 완료 — 챗봇 페이지 → "AAPL RSI 현황은?" 질문 → 스트리밍 답변 수신 확인.

---

## Phase 7: User Story 5 - 관심 종목 예측 점수 비교 (Priority: P5)

**Goal**: 관심 종목의 단기/중기/장기 AI 예측 점수(0-100)를 한 화면에서 비교

**Independent Test**: 관심 종목 2개 이상 AI 분석 완료 상태에서 GET /api/v1/scores/ranking?watchlist_only=true → 각 종목 단기/중기/장기 점수 반환. 점수 비교 화면에서 ScoreTable 렌더링 확인.

### Backend — User Story 5

- [ ] T048 [P] [US5] Create `backend/app/schemas/score.py` — Pydantic 스키마: ScoreItem(ticker, display_name, market, current_price, change_pct, buy_score, total_score, analyzed_at, in_watchlist), ScoreRankingResponse(market, sort_by, as_of, items, total, disclaimer)
- [ ] T049 [US5] Create `backend/app/routers/scores.py` — 2개 엔드포인트: GET /api/v1/stocks/{ticker}/score(최신 캐시에서 buy_score 조회, 없으면 404), GET /api/v1/scores/ranking(watchlist_only=true 시 인증 필요, analysis_cache에서 유효 점수 조회, sort 파라미터별 정렬, disclaimer 항상 포함); contracts/scores.md 계약 준수; main.py에 라우터 등록

### Frontend — User Story 5

- [ ] T050 [P] [US5] Create `frontend/src/components/ScoreTable.tsx` — 점수 비교 테이블 컴포넌트: 종목별 단기/중기/장기 점수 표시, 점수별 색상 코딩(ScoreGauge 색상 기준), 클릭 시 점수 근거 토글 표시, 정렬(단기/중기/장기/종합) 지원, 모바일 반응형(카드 레이아웃)
- [ ] T051 [US5] Create `frontend/src/app/scores/page.tsx` — 예측 점수 비교 페이지: 비로그인 시 관심 종목 추가 안내, 분석 없는 종목 안내("AI 분석 먼저 실행"), ScoreTable 렌더링, 정렬 탭(단기/중기/장기/종합), Disclaimer 컴포넌트 포함

**Checkpoint**: User Story 5 독립 완료 — 관심 종목 2개 AI 분석 → 점수 비교 화면에서 ScoreTable 표시 + 점수 근거 토글 확인. quickstart.md P5 체크리스트 통과.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 전체 사용자 스토리에 영향을 미치는 개선 사항

- [ ] T052 [P] Create `frontend/src/app/events/page.tsx` — 글로벌 이벤트 요약 페이지: 최근 AI 분석에서 추출된 global_events_summary 조회 (analysis_cache 최신 5개), 각 이벤트 카드 표시
- [ ] T053 [P] Apply `slowapi` rate limiting in `backend/app/main.py` — 전역 limiter 설정, /api/v1/ai/* 엔드포인트 분당 5회, 나머지 엔드포인트 분당 30회; 429 응답 시 Retry-After 헤더 포함
- [ ] T054 Add expired analysis_cache cleanup in `backend/app/services/cache.py` — get_valid_cache() 내에서 만료 레코드 삭제 또는 별도 cleanup_expired() 함수 추가
- [ ] T055 [P] Mobile responsiveness validation — 각 페이지(/, /stock/[ticker], /scores, /watchlist, /chat)를 375px viewport에서 수동 검증; Tailwind `sm:` 브레이크포인트로 반응형 미적용 요소 수정
- [ ] T056 [P] Add Claude API retry logic in `backend/app/services/claude.py` — httpx 타임아웃/5xx 오류 시 최대 2회 재시도, 최종 실패 시 503 예외 발생
- [ ] T057 Run `specs/001-stock-prediction-app/quickstart.md` E2E validation — 전체 체크리스트(P1~P5) 순서대로 수동 실행, 모든 항목 통과 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1 완료 후 시작 — 모든 사용자 스토리를 블로킹
- **User Story 1 (Phase 3)**: Phase 2 완료 후 시작 — 다른 스토리에 의존하지 않음
- **User Story 2 (Phase 4)**: Phase 2 완료 후 시작 — US1 완료 권장 (종목 상세 페이지 업데이트)
- **User Story 3 (Phase 5)**: Phase 2 완료 후 시작 — 독립적
- **User Story 4 (Phase 6)**: Phase 2 완료 후 시작 — US3 JWT 인증 완료 필요
- **User Story 5 (Phase 7)**: Phase 2 완료 후 시작 — US2 AI 분석(캐시에 점수 저장) + US3 관심 종목 완료 필요
- **Polish (Phase 8)**: 필요한 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Phase 2 완료 후 독립 시작 — MVP
- **US2 (P2)**: Phase 2 완료 후 독립 시작 — US1 이후 종목 상세 페이지에 통합
- **US3 (P3)**: Phase 2 완료 후 독립 시작 — JWT auth 포함
- **US4 (P4)**: US3 JWT auth 완료 필요 (chat history 저장)
- **US5 (P5)**: US2(점수 생성) + US3(관심 종목) 완료 필요

### Within Each User Story

- Backend schemas → services → routers 순서
- Frontend types → components → pages 순서
- [P] 표시 태스크는 같은 Phase 내에서 병렬 실행 가능

### Parallel Opportunities

- T001~T009 (Phase 1): T001+T002 동시, T003~T009 모두 병렬 가능
- T012~T015 (Phase 2 ORM): 4개 모델 병렬 생성
- T020~T022 (Phase 2 Frontend): 병렬 가능
- US1 Backend (T024~T027): T024 먼저, T025+T026 병렬, T027 마지막
- US1 Frontend (T028~T030): T028 먼저, T029+T030 순서 진행
- US2 Backend (T031~T035): T031+T032+T033 병렬, T034 다음, T035 마지막
- US2 Frontend (T036~T037): T036 먼저, T037 다음

---

## Parallel Example: User Story 1 (Backend)

```bash
# T024, T025, T026 동시 실행 (다른 파일, 의존성 없음):
Task: "Create backend/app/schemas/stock.py"
Task: "Implement backend/app/services/market_data.py"
Task: "Implement backend/app/services/indicators.py"

# T025, T026 완료 후:
Task: "Create backend/app/routers/stocks.py"
```

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1 완료: 프로젝트 구조 + 설정
2. Phase 2 완료: DB 모델 + FastAPI 골격 + Next.js 레이아웃
3. Phase 3 (US1) 완료: 종목 검색 + 차트 대시보드
4. **STOP & VALIDATE**: quickstart.md P1 체크리스트 전체 통과
5. Railway + Vercel 배포 → 실제 사용자 피드백 수집

### Incremental Delivery

1. Phase 1+2 → 기반 완료
2. US1 완료 → **배포 (MVP)**
3. US2 완료 → AI 분석 추가 → 재배포
4. US3 완료 → 회원가입/관심 종목 추가 → 재배포
5. US4 완료 → 챗봇 추가 → 재배포
6. US5 완료 → 점수 비교 추가 → 재배포

### Parallel Team Strategy

Team of 2:

1. **공통**: Phase 1+2 함께 완료
2. **이후 병렬**:
   - Developer A: US1(검색+차트) → US2(AI 분석)
   - Developer B: US3(인증+관심종목) → US4(챗봇)
3. **합류**: US5(점수 비교) — US2+US3 모두 필요하므로 둘 다 완료 후

---

## Notes

- [P] 태스크 = 다른 파일, 의존성 없음 → 병렬 실행 가능
- [Story] 라벨은 사용자 스토리 추적용 (spec.md 우선순위와 매핑)
- 각 Phase 체크포인트에서 해당 스토리 독립 동작 검증 후 다음 단계 진행
- Claude API 키는 서버 환경변수에만 존재 — 프론트엔드 코드에 절대 포함 금지
- 모든 AI 응답 화면에 Disclaimer 컴포넌트 포함 필수 (헌법 원칙 II)
- 점수 색상 코딩 일관성: ScoreGauge와 ScoreTable이 동일한 색상 기준 사용
