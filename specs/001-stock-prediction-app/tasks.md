---
description: "AI 기반 주가 예측 웹 애플리케이션 구현 태스크 목록"
---

# 태스크 목록: AI 기반 주가 예측 웹 애플리케이션

**입력 문서**: `specs/001-stock-prediction-app/`
**필수 문서**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, research.md ✅, quickstart.md ✅

**테스트**: 스펙에서 TDD를 명시적으로 요청하지 않았으므로 테스트 태스크는 포함하지 않음.

**구성 원칙**: 5개 사용자 스토리(US1–US5)별로 구성. 각 스토리는 독립적으로 구현·테스트·배포 가능.

## 형식: `[ID] [P?] [스토리?] 설명`

- **[P]**: 다른 파일을 다루며 의존성 없이 병렬 실행 가능
- **[US?]**: 해당 태스크가 속한 사용자 스토리 (US1, US2, ...)
- 모든 태스크에 정확한 파일 경로 포함

## 경로 규칙

- 백엔드: `backend/app/`, `backend/alembic/`, `backend/tests/`
- 프론트엔드: `frontend/src/app/`, `frontend/src/components/`, `frontend/src/services/`, `frontend/src/types/`

---

## 1단계: 프로젝트 초기화 (Setup)

**목적**: 백엔드·프론트엔드 프로젝트 기반 파일 및 디렉토리 생성

- [ ] T001 백엔드 디렉토리 구조 생성: `backend/app/models/`, `backend/app/schemas/`, `backend/app/routers/`, `backend/app/services/`, `backend/alembic/versions/`, `backend/tests/`
- [ ] T002 [P] 프론트엔드 디렉토리 구조 생성: `frontend/src/app/`, `frontend/src/components/`, `frontend/src/services/`, `frontend/src/types/`, `frontend/public/`
- [ ] T003 [P] `backend/requirements.txt` 작성 — 의존성 목록: fastapi, uvicorn[standard], anthropic, yfinance, financedatareader, pandas, pandas-ta, sqlalchemy[asyncio], asyncpg, alembic, slowapi, PyJWT, httpx, python-dotenv, pydantic-settings
- [ ] T004 [P] `frontend/package.json` 작성 — 의존성 목록: next@14, react, typescript, tailwindcss, lightweight-charts, axios, next-auth@5
- [ ] T005 [P] `backend/.env.example` 작성 — 필수 환경변수: DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, CORS_ORIGINS, RATE_LIMIT_PER_MINUTE, AI_RATE_LIMIT_PER_MINUTE, ANALYSIS_CACHE_TTL_SECONDS
- [ ] T006 [P] `frontend/.env.local.example` 작성 — 필수 환경변수: NEXT_PUBLIC_API_BASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, NEXTAUTH_BACKEND_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET
- [ ] T007 [P] `backend/Dockerfile` 작성 — 멀티스테이지 빌드: 빌더 스테이지(pip install) + 실행 스테이지(uvicorn CMD, EXPOSE 8000, HEALTHCHECK curl /health)
- [ ] T008 [P] `frontend/next.config.ts` 생성 (App Router 활성화) 및 `frontend/tailwind.config.ts` 생성 (content 경로 설정)
- [ ] T009 [P] `frontend/tsconfig.json` 생성 — 엄격한 TypeScript 설정, 경로 별칭(`@/*` → `./src/*`)

---

## 2단계: 공통 기반 구축 (Foundational)

**목적**: FastAPI 앱 골격, 데이터베이스 설정, ORM 모델, 마이그레이션, Next.js 레이아웃

**⚠️ 중요**: 이 단계가 완료되어야 모든 사용자 스토리 구현 시작 가능

- [ ] T010 `backend/app/config.py` 생성 — pydantic-settings `Settings` 클래스: DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, CORS_ORIGINS, RATE_LIMIT_PER_MINUTE, AI_RATE_LIMIT_PER_MINUTE, ANALYSIS_CACHE_TTL_SECONDS
- [ ] T011 `backend/app/database.py` 생성 — SQLAlchemy 2.x 비동기 엔진(`create_async_engine`), `AsyncSessionLocal` 팩토리, `get_db` 의존성 주입 함수
- [ ] T012 [P] `backend/app/models/user.py` 생성 — User ORM 모델: id(UUID PK), email(VARCHAR 255), name(VARCHAR 100), provider(VARCHAR 20, CHECK: google/kakao), provider_account_id(VARCHAR 255), is_active(BOOLEAN), created_at(TIMESTAMPTZ); UNIQUE 제약: (provider, provider_account_id)
- [ ] T013 [P] `backend/app/models/watchlist.py` 생성 — Watchlist ORM 모델: id(UUID PK), user_id(FK→users), ticker(VARCHAR 20), market(VARCHAR 5, CHECK: us/kr), display_name(VARCHAR 100), created_at; UNIQUE 제약: (user_id, ticker, market)
- [ ] T014 [P] `backend/app/models/analysis_cache.py` 생성 — AnalysisCache ORM 모델: id(UUID PK), ticker, market, analysis_text(TEXT), indicators_snapshot(JSONB), global_events_summary(TEXT), buy_score_short/mid/long(SMALLINT 0-100), buy_score_short/mid/long_label(VARCHAR 20), score_rationale(TEXT), created_at, expires_at; 인덱스: (ticker, market, expires_at)
- [ ] T015 [P] `backend/app/models/chat_message.py` 생성 — ChatMessage ORM 모델: id(UUID PK), user_id(FK→users, NULL 허용), ticker(NULL 허용), market(NULL 허용), question(TEXT), answer(TEXT, NULL 허용), created_at
- [ ] T016 `backend/alembic.ini` 및 `backend/alembic/env.py` 설정 — SQLAlchemy 비동기 지원, 모든 모델 임포트(자동 감지용)
- [ ] T017 초기 Alembic 마이그레이션 생성 (`backend/alembic/versions/`) — 테이블 생성: users, watchlist, analysis_cache, chat_messages
- [ ] T018 `backend/app/routers/health.py` 생성 — GET /health: `{"status": "ok", "db": "connected", "timestamp": "..."}` 비동기 DB 핑 포함
- [ ] T019 `backend/app/main.py` 생성 — FastAPI 앱, CORSMiddleware(CORS_ORIGINS), 라우터 등록(health), 전역 예외 핸들러(`{"error": CODE, "message": MSG}` 형식)
- [ ] T020 `frontend/src/types/index.ts` 생성 — TypeScript 인터페이스 정의: StockSearchResult, PriceData, Candle, IndicatorsData, BuyScore, BuyScoreTerm, AnalysisEvent, WatchlistItem, ChatMessage, ScoreRankingItem, UserProfile
- [ ] T021 [P] `frontend/src/services/api.ts` 생성 — Axios 인스턴스(baseURL=NEXT_PUBLIC_API_BASE_URL, Bearer 헤더 자동 주입), API 함수 스텁: searchStocks, getPrice, getIndicators, getMarketSummary, getWatchlist, addWatchlist, removeWatchlist, getScore, getScoreRanking, verifyAuth, getMe, updateMe
- [ ] T022 [P] `frontend/src/components/Disclaimer.tsx` 생성 — 면책 고지 컴포넌트: "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다." (항상 표시)
- [ ] T023 `frontend/src/app/layout.tsx` 생성 — 루트 레이아웃: 네비게이션 바(메인/종목검색/관심종목/점수비교/챗봇), Tailwind CSS 전역 적용, 반응형 헤더

**체크포인트**: `uvicorn app.main:app --reload` 실행 → GET /health 정상 응답 확인. `npm run dev` 실행 → http://localhost:3000 레이아웃 확인.

---

## 3단계: 사용자 스토리 1 — 종목 검색 및 대시보드 (우선순위: P1) 🎯 MVP

**목표**: 종목명·티커로 검색, 현재가·등락률·거래량 표시, 1M/3M/6M/1Y 주가 차트 조회

**독립 테스트**: 로그인 없이 "AAPL" 검색 → 현재가·차트 표시. `GET /api/v1/stocks/search?q=AAPL` 및 `GET /api/v1/stocks/AAPL/price?period=1m` 응답 확인.

### 백엔드 — 사용자 스토리 1

- [ ] T024 [P] [US1] `backend/app/schemas/stock.py` 생성 — Pydantic 스키마: StockSearchResult, PriceResponse(candles 배열 포함, market_status 필드), IndicatorsResponse, MarketSummaryResponse
- [ ] T025 [US1] `backend/app/services/market_data.py` 구현 — yfinance(미국) + FinanceDataReader(한국) 통합: search_stock(), get_ohlcv(ticker, market, period), get_current_price(), get_market_summary(); 데이터 없을 시 503 예외, 타임스탬프 포함; 시장 휴장일 처리(market_status 반환), "동명 종목 거래소명 표시 로직" 포함
- [ ] T026 [US1] `backend/app/services/indicators.py` 구현 — pandas_ta 기술 지표 계산: calculate_all(df) → SMA(5·20·60·200), RSI(14), MACD(12·26·9), 볼린저밴드(20·2σ), 스토캐스틱(14·3·3); 데이터 200개 미만 시 ValueError; NaN 처리 포함
- [ ] T027 [US1] `backend/app/routers/stocks.py` 생성 — 4개 엔드포인트: GET /search, GET /{ticker}/price, GET /{ticker}/indicators, GET /market/summary; market_data·indicators 서비스 호출; `contracts/stocks.md` 계약 준수; `main.py`에 라우터 등록

### 프론트엔드 — 사용자 스토리 1

- [ ] T028 [P] [US1] `frontend/src/components/StockChart.tsx` 생성 — Lightweight Charts 래퍼: candles 배열 props, 캔들스틱 차트, 반응형(컨테이너 너비 100%), 모바일 375px 이상 정상 표시
- [ ] T029 [US1] `frontend/src/app/page.tsx` 생성 — 메인 대시보드: 종목 검색창(입력+버튼), 시장 요약 카드(S&P 500·NASDAQ·DOW), 검색 결과 리스트; searchStocks() + getMarketSummary() 호출
- [ ] T030 [US1] `frontend/src/app/stock/[ticker]/page.tsx` 생성 — 종목 상세: 현재가·등락률·거래량·시가총액 헤더, 1M/3M/6M/1Y 탭으로 StockChart 전환, 기술 지표 수치 표시(RSI·MACD·볼린저밴드 등), Disclaimer 컴포넌트 포함

**체크포인트**: US1 독립 완료 — 브라우저 http://localhost:3000 → AAPL 검색 → 차트·지표 표시 확인. `quickstart.md` P1 체크리스트 통과.

---

## 4단계: 사용자 스토리 2 — AI 기술적 분석 리포트 (우선순위: P2)

**목표**: 기술 지표 데이터 기반으로 AI가 단기(1주)·중기(1개월) 분석 리포트 + 예측 점수를 SSE 스트리밍으로 제공

**독립 테스트**: 종목 상세 → "AI 분석" 버튼 → 1분 이내 SSE 스트리밍 텍스트·점수 수신. `POST /api/v1/ai/analyze {"ticker":"AAPL","market":"us"}` curl로 SSE 이벤트 확인.

### 백엔드 — 사용자 스토리 2

- [ ] T031 [P] [US2] `backend/app/schemas/analysis.py` 생성 — Pydantic 스키마: AnalyzeRequest(ticker, market, period), BuyScoreTerm(period, score, label), BuyScore(short_term, mid_term, long_term), AnalyzeEventChunk(type, text/score/disclaimer/cached)
- [ ] T032 [US2] `backend/app/services/score_parser.py` 구현 — Claude 응답 전체 텍스트에서 buy_score JSON 블록 정규식 추출: extract_buy_score(text) → dict | None; 파싱 실패 시 None 반환
- [ ] T033 [US2] `backend/app/services/cache.py` 구현 — PostgreSQL analysis_cache TTL 캐싱: get_valid_cache(ticker, market) → 유효 캐시 조회(expires_at > now()), save_cache(ticker, market, analysis_text, indicators_snapshot, buy_score) → INSERT(expires_at=now()+TTL)
- [ ] T034 [US2] `backend/app/services/claude.py` 구현 — Claude API SSE 스트리밍 서비스: stream_analysis(ticker, market, indicators) async generator; model=claude-sonnet-4-20250514, tools=[web_search_20250305], 시스템 프롬프트(역할+지시+buy_score JSON 형식+점수 기준 0-100+면책 고지), 기술 지표 JSON 컨텍스트 포함; 타임아웃 60초; 재시도 2회
- [ ] T035 [US2] `backend/app/routers/ai.py` 생성 — POST /api/v1/ai/analyze: 캐시 확인 → 캐시 미스 시 market_data+indicators 계산 → claude.py 스트리밍 → score_parser로 buy_score 추출 → cache.py 저장; StreamingResponse(text/event-stream); slowapi rate limit 분당 5회; `contracts/ai.md` 계약 준수; `main.py`에 라우터 등록

### 프론트엔드 — 사용자 스토리 2

- [ ] T036 [P] [US2] `frontend/src/components/ScoreGauge.tsx` 생성 — 예측 점수 게이지: score(0-100) props, 색상 코딩(0-20 #EF4444·21-40 #F97316·41-60 #EAB308·61-80 #84CC16·81-100 #22C55E), 라벨(강력 매도~강력 매수), 단기·중기·장기 3개 게이지
- [ ] T037 [US2] `frontend/src/app/stock/[ticker]/page.tsx` 업데이트 — AI 분석 섹션 추가: "AI 분석 요청" 버튼, SSE fetch로 텍스트 스트리밍 표시(data: 이벤트 파싱), score 이벤트 수신 시 ScoreGauge 렌더링, disclaimer 이벤트 수신 시 Disclaimer 표시, 캐시 응답 시 "X분 전 분석" 배지 표시

**체크포인트**: US2 독립 완료 — 종목 상세 → AI 분석 버튼 → 텍스트 스트리밍 + 점수 게이지 + 면책 고지 확인.

---

## 5단계: 사용자 스토리 3 — 관심 종목 관리 (우선순위: P3)

**목표**: Google/Kakao OAuth 로그인, 관심 종목 등록·해제, 관심 종목 요약 화면 조회

**독립 테스트**: Google 로그인 → POST /api/v1/auth/verify 성공 → AAPL 관심 추가 → GET /api/v1/watchlist에서 조회 → 관심 종목 화면에서 현재가 표시.

### 백엔드 — 사용자 스토리 3

- [ ] T038 [P] [US3] `backend/app/schemas/watchlist.py` 생성 — Pydantic 스키마: WatchlistAddRequest(ticker, market, display_name), WatchlistItem(id, ticker, market, display_name, current_price, change_pct, volume, added_at), WatchlistResponse(items, total, limit)
- [ ] T039 [US3] `backend/app/services/auth.py` 구현 — NextAuth.js JWT 검증 서비스: verify_nextauth_token(token: str) → dict(user_id, email, name, provider), get_current_user() FastAPI 의존성(Authorization 헤더 추출 → 토큰 검증 → DB 사용자 조회·생성); PyJWT + 공유 JWT_SECRET; 토큰 만료·유효성 오류 시 401 예외
- [ ] T040 [US3] `backend/app/routers/auth.py` 생성 — 3개 엔드포인트: POST /api/v1/auth/verify(NextAuth JWT 검증 + users 테이블 upsert, is_new_user 반환), GET /api/v1/users/me(프로필+watchlist_count), PUT /api/v1/users/me(name 수정); get_current_user 의존성; `contracts/auth.md` 계약 준수; `main.py`에 라우터 등록
- [ ] T041 [US3] `backend/app/routers/watchlist.py` 생성 — 3개 엔드포인트: GET /api/v1/watchlist(목록+현재가), POST /api/v1/watchlist(추가, 30개 제한·중복 방지), DELETE /api/v1/watchlist/{ticker}(삭제); get_current_user 의존성; `contracts/watchlist.md` 계약 준수; `main.py`에 라우터 등록

### 프론트엔드 — 사용자 스토리 3

- [ ] T042 [P] [US3] NextAuth.js v5 설정 — `frontend/src/auth.ts` 생성: Google + Kakao providers, JWT 콜백(첫 로그인 시 POST /api/v1/auth/verify 호출 → user_id 획득), session 콜백(user_id·provider 포함); `frontend/src/app/api/auth/[...nextauth]/route.ts` 핸들러 생성
- [ ] T043 [P] [US3] `frontend/src/components/WatchlistCard.tsx` 생성 — 관심 종목 카드: ticker, display_name, current_price, change_pct, volume 표시; 등락률 색상(양수 초록, 음수 빨강)
- [ ] T044 [US3] `frontend/src/app/watchlist/page.tsx` 생성 — 관심 종목 관리 페이지: 비로그인 시 Google/Kakao 로그인 버튼(NextAuth signIn()), 로그인 시 WatchlistCard 목록, 개별 종목 삭제 버튼; getWatchlist() 호출
- [ ] T045 [US3] `frontend/src/app/stock/[ticker]/page.tsx` 업데이트 — 관심 종목 추가·해제 버튼: useSession()으로 로그인 상태 확인, addWatchlist()/removeWatchlist() 호출, 비로그인 시 로그인 유도 메시지

**체크포인트**: US3 독립 완료 — Google 로그인 → AAPL 관심 추가 → 관심 종목 화면에서 현재가 표시 확인.

---

## 6단계: 사용자 스토리 4 — AI 챗봇 질의응답 (우선순위: P4)

**목표**: 종목 관련 자연어 질문 → Claude가 해당 종목 데이터 기반으로 자연어 응답 (SSE 스트리밍)

**독립 테스트**: `POST /api/v1/ai/chat {"ticker":"AAPL","message":"RSI가 과매수 구간인가요?"}` → SSE 이벤트 수신. 범위 외 질문 시 out_of_scope 이벤트 반환.

### 백엔드 — 사용자 스토리 4

- [ ] T046 [US4] `backend/app/routers/ai.py` 확장 — POST /api/v1/ai/chat 엔드포인트 추가: 종목 데이터(있을 경우) 조회 → Claude 호출(web_search, 종목 컨텍스트, 범위 외 질문 감지 시스템 프롬프트) → SSE 스트리밍; ChatMessage DB 저장(question 즉시·answer 완료 후); `contracts/ai.md` 계약 준수; slowapi rate limit 분당 10회

### 프론트엔드 — 사용자 스토리 4

- [ ] T047 [P] [US4] `frontend/src/components/ChatInterface.tsx` 생성 — 챗봇 UI: 메시지 목록(사용자·AI 말풍선), 입력창+전송 버튼, SSE 스트리밍 텍스트 실시간 표시(타이핑 인디케이터), out_of_scope 이벤트 처리, disclaimer 이벤트 처리, 모바일 반응형
- [ ] T048 [US4] `frontend/src/app/chat/page.tsx` 생성 — 챗봇 페이지: 상단 종목 선택(선택적), ChatInterface 컴포넌트, 페이지 하단 Disclaimer 표시

**체크포인트**: US4 독립 완료 — 챗봇 페이지 → "AAPL RSI 현황은?" → SSE 스트리밍 답변 수신 확인.

---

## 7단계: 사용자 스토리 5 — 관심 종목 예측 점수 비교 (우선순위: P5)

**목표**: 관심 종목의 단기·중기·장기 AI 예측 점수(0-100)를 한 화면에서 비교

**독립 테스트**: 관심 종목 2개 이상 AI 분석 완료 상태 → `GET /api/v1/scores/ranking?watchlist_only=true` → 각 종목 점수 반환. 비교 화면에서 ScoreTable 렌더링 확인.

### 백엔드 — 사용자 스토리 5

- [ ] T049 [P] [US5] `backend/app/schemas/score.py` 생성 — Pydantic 스키마: ScoreItem(ticker, display_name, market, current_price, change_pct, buy_score, total_score, analyzed_at, in_watchlist), ScoreRankingResponse(market, sort_by, as_of, items, total, disclaimer)
- [ ] T050 [US5] `backend/app/routers/scores.py` 생성 — 2개 엔드포인트: GET /api/v1/stocks/{ticker}/score(최신 캐시에서 buy_score 조회, 없으면 404), GET /api/v1/scores/ranking(watchlist_only=true 시 인증 필요, analysis_cache 유효 점수 조회, sort 파라미터별 정렬, disclaimer 항상 포함); `contracts/scores.md` 계약 준수; `main.py`에 라우터 등록

### 프론트엔드 — 사용자 스토리 5

- [ ] T051 [P] [US5] `frontend/src/components/ScoreTable.tsx` 생성 — 점수 비교 테이블: 종목별 단기·중기·장기 점수, 점수별 색상 코딩(ScoreGauge 기준), 클릭 시 점수 근거 토글, 정렬(단기·중기·장기·종합) 지원, 모바일 반응형(카드 레이아웃)
- [ ] T052 [US5] `frontend/src/app/scores/page.tsx` 생성 — 예측 점수 비교 페이지: 비로그인 시 로그인 안내, 분석 없는 종목 안내("AI 분석 먼저 실행"), ScoreTable 렌더링, 정렬 탭(단기·중기·장기·종합), Disclaimer 컴포넌트 포함

**체크포인트**: US5 독립 완료 — 관심 종목 2개 AI 분석 → 점수 비교 화면에서 ScoreTable 표시 + 점수 근거 토글 확인. `quickstart.md` P5 체크리스트 통과.

---

## 8단계: 마무리 및 공통 처리 (Polish)

**목적**: 전체 사용자 스토리에 영향을 미치는 개선 사항 및 품질 보완

- [ ] T053 [P] `frontend/src/app/events/page.tsx` 생성 — 글로벌 이벤트 요약 페이지: 최근 AI 분석에서 추출된 global_events_summary 조회(analysis_cache 최신 5개), 이벤트 카드 목록 표시
- [ ] T054 [P] `backend/app/main.py` slowapi rate limiting 적용 — 전역 limiter, /api/v1/ai/* 분당 5회, 나머지 분당 30회; 429 응답 시 Retry-After 헤더
- [ ] T055 `backend/app/services/cache.py` 만료 캐시 정리 추가 — get_valid_cache() 내 만료 레코드 삭제 또는 별도 cleanup_expired() 함수
- [ ] T056 [P] `backend/app/services/claude.py` 재시도 로직 추가 — httpx 타임아웃·5xx 오류 시 최대 2회 재시도, 최종 실패 시 503 예외
- [ ] T057 [P] 모바일 반응형 검증 — 각 페이지(/, /stock/[ticker], /scores, /watchlist, /chat)를 375px viewport에서 수동 확인; Tailwind `sm:` 브레이크포인트 미적용 요소 수정
- [ ] T058 `specs/001-stock-prediction-app/quickstart.md` E2E 검증 실행 — 전체 체크리스트(P1~P5) 순서대로 수동 실행, 모든 항목 통과 확인
- [ ] T059 AI 분석 대기 상태 UI(로딩 인디케이터, 요청 큐 안내)

---

## 9단계: 회원 탈퇴 (FR-020 — 헌법 §Data&Privacy MUST)

**목표**: 로그인한 사용자가 계정을 탈퇴할 수 있으며, 탈퇴 시 관련 개인 데이터가 즉시 정리된다.

**독립 테스트**: 로그인 상태에서 `DELETE /api/v1/users/me` 요청 → 204 응답 → 이후 동일 토큰으로 `/watchlist` 요청 시 401 반환 확인.

### 백엔드 — 회원 탈퇴

- [ ] T060 [P] [US3] `backend/alembic/versions/` 마이그레이션 추가 — `users` 테이블에 `deleted_at TIMESTAMPTZ NULL` 컬럼 추가; `backend/app/models/user.py`에 `deleted_at` 필드 추가
- [ ] T061 [US3] `backend/app/services/auth.py` 회원 탈퇴 서비스 구현 — `delete_user(user_id)` 비동기 함수: (1) watchlist WHERE user_id 물리 삭제, (2) chat_messages SET user_id=NULL WHERE user_id, (3) users SET is_active=false, deleted_at=now() WHERE id; 트랜잭션 내 처리; `get_current_user()`에서 `deleted_at IS NOT NULL` 계정 접근 시 403 예외 추가
- [ ] T062 [US3] `backend/app/routers/auth.py` `DELETE /api/v1/users/me` 엔드포인트 추가 — `get_current_user` 의존성, `delete_user(user_id)` 호출, 성공 시 204 반환; `contracts/auth.md` 계약 준수

### 프론트엔드 — 회원 탈퇴

- [ ] T063 [US3] `frontend/src/app/watchlist/page.tsx` 회원 탈퇴 UI 추가 — 페이지 하단 "회원 탈퇴" 버튼, 클릭 시 확인 모달("탈퇴하면 관심 종목이 모두 삭제됩니다. 계속하시겠습니까?"), 확인 후 `DELETE /api/v1/users/me` 호출 → `signOut()` 호출 → `/` 메인으로 리다이렉트

**체크포인트**: 로그인 → 관심 종목 추가 → 회원 탈퇴 → 재로그인 시 관심 종목 없음 확인. `quickstart.md` P3-EXT 체크리스트 통과.

---

## 의존성 및 실행 순서

### 단계 간 의존성

- **1단계 (Setup)**: 의존성 없음 — 즉시 시작 가능
- **2단계 (Foundational)**: 1단계 완료 후 시작 — 이후 모든 단계 블로킹
- **3단계 (US1)**: 2단계 완료 후 시작 — 다른 스토리에 독립적
- **4단계 (US2)**: 2단계 완료 후 시작 — US1 이후 종목 상세 페이지에 통합
- **5단계 (US3)**: 2단계 완료 후 시작 — NextAuth.js 인증 포함
- **6단계 (US4)**: US3 JWT 인증(T039) 완료 필요
- **7단계 (US5)**: US2(점수 생성) + US3(관심 종목) 완료 필요
- **8단계 (Polish)**: 필요한 스토리 완료 후
- **9단계 (회원 탈퇴)**: US3(T039 auth 서비스) 완료 후 — T060→T061→T062 순서, T063 병렬 가능

### 사용자 스토리 간 의존성

| 스토리 | 시작 조건 | 독립 여부 |
|--------|-----------|-----------|
| US1 (P1) | 2단계 완료 | ✅ 독립 (MVP) |
| US2 (P2) | 2단계 완료 | ✅ 독립 |
| US3 (P3) | 2단계 완료 | ✅ 독립 (인증 포함) |
| US4 (P4) | US3 T039 완료 | US3 인증 필요 |
| US5 (P5) | US2 + US3 완료 | US2·US3 모두 필요 |

### 스토리 내 실행 순서

- 백엔드: schemas → services → routers 순서
- 프론트엔드: types → components → pages 순서
- [P] 표시 태스크는 같은 단계 내에서 병렬 실행 가능

---

## 병렬 실행 예시

### 1단계 (Setup)

```
T001 + T002 동시 시작 (백엔드/프론트엔드 디렉토리)
T003 + T004 + T005 + T006 + T007 + T008 + T009 모두 병렬 가능
```

### 2단계 (Foundational)

```
T010 → T011 순서
T012 + T013 + T014 + T015 병렬 (4개 ORM 모델 동시 생성)
T016 → T017 → T018 → T019 순서
T020 + T021 + T022 병렬 (프론트엔드 기반 파일)
T023 마지막
```

### 3단계 (US1 백엔드)

```
T024 병렬 가능
T025 + T026 병렬 (market_data + indicators 서비스)
T027 (T025·T026 완료 후)
```

### 4단계 (US2 백엔드)

```
T031 + T032 + T033 병렬
T034 다음
T035 마지막
```

---

## 구현 전략

### MVP 우선 (US1만 구현)

1. 1단계 완료: 프로젝트 구조·설정
2. 2단계 완료: DB 모델·FastAPI 골격·Next.js 레이아웃
3. 3단계 완료: 종목 검색·차트 대시보드 (T001~T030)
4. **중단 및 검증**: `quickstart.md` P1 체크리스트 전체 통과
5. Railway + Vercel 배포 → 실제 사용자 피드백 수집

### 점진적 전달 (Incremental Delivery)

1. 1·2단계 → 기반 완료
2. US1 완료 → **MVP 배포**
3. US2 완료 → AI 분석 추가 → 재배포
4. US3 완료 → OAuth 로그인·관심 종목 추가 → 재배포
5. US4 완료 → 챗봇 추가 → 재배포
6. US5 완료 → 점수 비교 추가 → 재배포

### 2인 팀 병렬 전략

1. **공통**: 1·2단계 함께 완료
2. **이후 병렬**:
   - 개발자 A: US1(검색·차트) → US2(AI 분석)
   - 개발자 B: US3(인증·관심 종목) → US4(챗봇)
3. **합류**: US5(점수 비교) — US2+US3 모두 완료 후

---

## 참고 사항

- [P] 태스크 = 다른 파일, 의존성 없음 → 병렬 실행 가능
- [US?] 라벨은 사용자 스토리 추적용 (spec.md 우선순위와 매핑)
- 각 단계 체크포인트에서 해당 스토리 독립 동작 검증 후 다음 단계 진행
- Claude API 키는 서버 환경변수에만 존재 — 프론트엔드 코드에 절대 포함 금지 (헌법 원칙 I)
- 모든 AI 응답 화면에 Disclaimer 컴포넌트 포함 필수 (헌법 원칙 II)
- JWT_SECRET(백엔드)과 NEXTAUTH_SECRET(프론트엔드)은 반드시 동일한 값 사용
- 점수 색상 코딩: ScoreGauge와 ScoreTable이 동일한 기준 사용 (일관성)
