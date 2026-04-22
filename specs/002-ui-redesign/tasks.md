# 태스크 목록: UI 전면 재편 + Watchlist CRUD + API 연결 테스트

**입력**: `/specs/002-ui-redesign/` 설계 문서  
**전제 조건**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md  
**테스트**: 명시적 요청 없음 — 구현 태스크만 포함 (quickstart.md 수동 체크리스트 활용)

> **Scope Amendment (2026-04-19)**: T018~T021 추가 — API 연결 테스트 + Watchlist 추가 UI

**조직 방식**: 사용자 스토리별로 태스크 그룹화 → 각 스토리 독립 구현 및 테스트 가능

---

## 형식: `[ID] [P?] [Story?] 설명 (파일 경로)`

- **[P]**: 다른 파일 작업이므로 병렬 실행 가능
- **[Story]**: 해당 태스크가 속한 사용자 스토리 (US1~US4)
- 설명에 정확한 파일 경로 포함

---

## Phase 1: Setup (공통 기반 설정)

**목적**: 모든 페이지/컴포넌트에 적용되는 최소 디자인 토큰 설정

- [X] T001 `frontend/src/app/globals.css`에 다크 배경 기본값 추가 — `@layer base { body { @apply bg-slate-950 text-slate-50; } }`

---

## Phase 2: Foundational (공통 컴포넌트 — 모든 스토리 의존)

**목적**: US-001~US-004 전반에서 공통으로 사용하는 재사용 컴포넌트 생성

**⚠️ 중요**: 이 단계 완료 전에는 어떤 사용자 스토리 작업도 시작할 수 없음

- [X] T002 `frontend/src/components/GradientButton.tsx` 신규 생성 — `variant("primary"|"outline")`, `size("sm"|"md"|"lg")` props 지원, `from-purple-600 to-blue-500` 그라디언트 버튼

**체크포인트**: T001, T002 완료 시 → 각 사용자 스토리 구현 시작 가능

---

## Phase 3: 사용자 스토리 1 — 미인증 방문자 로그인 화면 진입 (우선순위: P1) 🎯 MVP

**목표**: 비로그인 사용자가 `/` 접속 시 세련된 로그인 화면으로 안내

**독립 테스트**:
1. 비로그인 상태에서 `http://localhost:3000/` 접속 → `/login` 자동 리다이렉트 확인
2. 로그인된 상태에서 `/login` 접속 → `/dashboard` 리다이렉트 확인
3. Google/Kakao 로그인 버튼 클릭 시 OAuth 흐름 시작 확인
4. 로그인 페이지가 보라→파랑 그라디언트 배경으로 표시되는지 확인

### US-001 구현

- [X] T003 [US1] `frontend/src/app/page.tsx`를 서버 컴포넌트로 변환 — `getServerSession(authOptions)` 호출 후 세션 존재 시 `/dashboard`, 없으면 `/login`으로 `redirect()` 처리
- [X] T004 [US1] `frontend/src/app/login/page.tsx` 신규 생성 — 풀스크린 보라→파랑 그라디언트 배경, 중앙 글래스 카드(GradientButton 사용), Google/Kakao 로그인 버튼, 서비스 로고 및 소개 문구 포함. 이미 로그인된 경우 `/dashboard`로 redirect

**체크포인트**: 비로그인 방문자가 로그인 화면에서 OAuth 로그인을 할 수 있어야 함

---

## Phase 4: 사용자 스토리 2 — 로그인 후 관심 종목 대시보드 진입 (우선순위: P2)

**목표**: 로그인 후 관심 종목 카드 대시보드를 확인하고 종목 상세로 이동

**독립 테스트**:
1. Google/Kakao 로그인 성공 후 → `/dashboard`로 이동하는지 확인 (`callbackUrl="/dashboard"`)
2. 대시보드에서 관심 종목 카드들이 그리드로 표시되는지 확인
3. 카드에 종목명, 현재가, 등락률, AI 투자 총점이 표시되는지 확인
4. 카드 클릭 시 `/stock/[ticker]?market=[market]`으로 이동하는지 확인
5. 관심 종목 0개인 경우 빈 상태 안내 및 종목 검색 링크가 표시되는지 확인
6. 로딩 중 스켈레톤 카드 6개가 표시되는지 확인

### US-002 구현

- [X] T005 [US2] `frontend/src/components/DashboardCard.tsx` 신규 생성 — `WatchlistItem` + 선택적 `ScoreRankingItem` props 수용, 글래스 카드(`bg-white/5 backdrop-blur-md border-white/10 rounded-2xl`) 스타일, 종목명/현재가/등락률/AI 총점 표시, `getScoreLabel()` 텍스트 함께 표시, 호버 시 `hover:scale-[1.02] hover:border-purple-500/50 transition-all duration-300`
- [X] T006 [US2] `frontend/src/app/dashboard/page.tsx` 신규 생성 — 비인증 시 `/login` redirect, `getWatchlist()` + `getScoreRanking(watchlist_only=true)` 병렬 호출(`Promise.allSettled`), ticker 기준 조인으로 카드 데이터 구성, 2열(모바일)/3열(데스크톱) 반응형 그리드, 로딩 중 스켈레톤 6개 표시, 빈 상태 UI 포함

**체크포인트**: 로그인 후 대시보드에서 관심 종목 카드를 확인하고 상세 페이지로 이동할 수 있어야 함

---

## Phase 5: 사용자 스토리 3 — 전체 페이지 보라/파랑 다크 테마 적용 (우선순위: P3)

**목표**: 기존 모든 페이지와 컴포넌트에 새 디자인 시스템 일관 적용

**독립 테스트**:
1. `/watchlist`, `/scores`, `/stock/[ticker]`, `/chat` 모든 페이지에서 다크 배경 확인
2. 흰색 배경, 회색 테두리 등 구 디자인 요소가 남아있지 않은지 확인
3. 기존 기능(종목 삭제, 점수 정렬, AI 분석 등)이 정상 동작하는지 확인
4. `Disclaimer` 컴포넌트가 AI 출력 화면에서 다크 테마로 표시되는지 확인

### US-003 구현 (파일이 서로 독립적이므로 병렬 실행 가능)

- [X] T007 [P] [US3] `frontend/src/components/WatchlistCard.tsx` 다크 테마 적용 — `bg-white border-gray-200` → `bg-white/5 border-white/10`, 텍스트 색상 `text-slate-50`/`text-slate-400`, 등락률 `text-emerald-400`/`text-rose-400`, 호버 `hover:bg-white/10`
- [X] T008 [P] [US3] `frontend/src/components/Disclaimer.tsx` 다크 테마 적용 — 배경 `bg-amber-950/30 border-amber-400/20`, 텍스트 `text-amber-300`
- [X] T009 [P] [US3] `frontend/src/components/ScoreGauge.tsx` 다크 테마 적용 — 배경 원 색상 `stroke-white/10`, 텍스트 `text-slate-50`
- [X] T010 [P] [US3] `frontend/src/components/ScoreTable.tsx` 다크 테마 적용 — 테이블 헤더 `bg-white/5 text-slate-400`, 행 `border-white/5 hover:bg-white/5`, 정렬 버튼 `text-violet-400`
- [X] T011 [P] [US3] `frontend/src/components/ChatInterface.tsx` 다크 테마 적용 — 입력창 `bg-white/10 border-white/20 text-slate-50 placeholder:text-slate-500`, 메시지 버블 사용자/AI 색상 구분
- [X] T012 [P] [US3] `frontend/src/app/watchlist/page.tsx` 다크 테마 업데이트 — 제목/보조텍스트/로딩/빈상태 색상, 회원탈퇴 모달 다크 테마, 로그인 안내 UI에 GradientButton 활용
- [X] T013 [P] [US3] `frontend/src/app/scores/page.tsx` 다크 테마 업데이트 — 헤더/새로고침 버튼/오류 메시지/빈상태 다크 스타일, 로그인 안내 UI에 GradientButton 활용
- [X] T014 [P] [US3] `frontend/src/app/stock/[ticker]/page.tsx` 다크 테마 업데이트 — 종목 헤더 카드, 지표 카드, AI 분석 영역 글래스 카드 스타일 적용

**체크포인트**: 모든 페이지에서 보라/파랑 다크 테마가 일관성 있게 표시되고 기존 기능이 정상 동작해야 함

---

## Phase 6: 사용자 스토리 4 — 네비게이션 바 재디자인 (우선순위: P4)

**목표**: 앱 전체 레이아웃의 nav bar를 다크 테마에 맞게 재디자인

**독립 테스트**:
1. Nav bar에 반투명 다크 배경(`backdrop-blur`)이 적용되는지 확인
2. "StockAI" 로고가 보라→파랑 그라디언트 텍스트로 표시되는지 확인
3. 현재 페이지의 nav 링크가 활성(밝은 텍스트) 상태로 표시되는지 확인
4. 로그인 상태에서 사용자 이름 + 로그아웃 버튼이 표시되는지 확인
5. 비로그인 상태에서 "로그인" 버튼이 표시되고 클릭 시 `/login`으로 이동하는지 확인
6. 모바일(375px) 해상도에서 nav가 정상 표시되는지 확인

### US-004 구현

- [X] T015 [US4] `frontend/src/app/layout.tsx` nav 전면 재디자인 — 배경 `bg-slate-950/80 backdrop-blur-md border-b border-white/5`, 로고 `bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent`, 활성 링크 `text-white`(비활성 `text-slate-400 hover:text-slate-200`), `useSession()`으로 로그인 상태 감지 후 사용자명 + 로그아웃 버튼 or 로그인 링크 표시, `href="/"` → `href="/dashboard"`(로그인 시) 로고 링크 변경
- [X] T016 [US4] `frontend/src/app/layout.tsx` 모바일 반응형 nav 검증 — 375px 뷰포트에서 링크 간격/텍스트 크기 확인, 필요 시 `hidden sm:flex` 등으로 모바일 대응

**체크포인트**: 모든 페이지에서 일관된 다크 테마 nav bar가 표시되고 사용자 인증 상태가 반영되어야 함

---

## Phase 7: Scope Amendment — API 연결 검증 (Foundational)

**목표**: 백엔드 API 전 엔드포인트 연결 여부를 자동으로 검증하는 테스트 스크립트 작성

**독립 테스트**: `pytest tests/test_api_connections.py -v` 실행 → 7개 테스트 모두 PASSED

### 구현

- [X] T018 `backend/app/main.py` CORS 설정 확인 — `allow_origins`에 `http://localhost:3000` 포함 여부 확인, 누락 시 추가
- [X] T019 `backend/tests/test_api_connections.py` 신규 작성 — pytest + httpx, `BASE_URL="http://localhost:8000"`, 아래 7개 테스트 포함:
  - `test_health()`: `GET /health` → 200
  - `test_stock_search()`: `GET /api/v1/stocks/search?q=AAPL` → 200 + list 타입
  - `test_stock_price()`: `GET /api/v1/stocks/AAPL/price` → 200 + `candles` 키 존재
  - `test_stock_indicators()`: `GET /api/v1/stocks/AAPL/indicators` → 200 + `rsi` 키 존재
  - `test_market_summary()`: `GET /api/v1/stocks/market/summary` → 200 + list 타입
  - `test_watchlist_requires_auth()`: `GET /api/v1/watchlist` (Authorization 헤더 없음) → 401 또는 403
  - `test_auth_verify_invalid_token()`: `POST /api/v1/auth/verify` (헤더: `Authorization: Bearer invalid`) → 401 또는 403

**체크포인트**: 백엔드 실행 중 `pytest tests/test_api_connections.py -v` → 전체 통과 확인

---

## Phase 8: Scope Amendment — Watchlist 추가 UI (US-002 확장)

**목표**: `/watchlist` 페이지에 종목 검색 + 추가 UI 추가 (현재 삭제만 가능, 추가 불가 상태)

**독립 테스트**:
1. `/watchlist` 페이지 상단에 검색창 + 마켓 필터 표시 확인
2. "AAPL" 검색 → 결과 드롭다운 표시 확인
3. "+ 추가" 클릭 → 목록에 즉시 반영 확인
4. 이미 추가된 종목에 "추가됨" 뱃지 표시 확인
5. 중복 추가 시 에러 메시지 표시 확인
6. 삭제 버튼 클릭 → 목록에서 즉시 제거 확인

### 구현

- [X] T020 [US2] `frontend/src/app/(main)/watchlist/page.tsx` 상단에 종목 검색 + 추가 패널 추가:
  - **상태 추가**: `query`, `market("us"|"kr")`, `results(StockSearchResult[])`, `searching`, `adding(ticker|null)`
  - **검색 디바운스**: `query` 변경 300ms 후 `searchStocks(query, market)` 호출, `results` 업데이트
  - **이미 추가된 종목 표시**: `results`에서 `items.some(i => i.ticker === r.ticker)`이면 "추가됨" 뱃지, 버튼 비활성화
  - **추가 핸들러**: `addWatchlist(token, ticker, market, display_name)` 호출 → 성공 시 `items` 상태 즉시 업데이트 + `results` 초기화
  - **에러 처리**: 409 → "이미 추가된 종목입니다", 400 → "관심 종목은 최대 30개까지 추가할 수 있습니다", 그 외 → "추가에 실패했습니다"
  - **UI 스타일**: 검색창 `bg-white/10 border-white/20 rounded-xl text-slate-50`, 결과 드롭다운 `bg-slate-900 border border-white/10 rounded-xl`, 추가 버튼 `from-purple-600 to-blue-500` 그라디언트

---

## 최종 Phase: 마무리 및 검증

**목적**: 전체 UX 흐름 확인 및 quickstart.md 체크리스트 수행

- [X] T017 quickstart.md 기존 UI 테스트 체크리스트 수행 — 비로그인/로그인 리다이렉트, 대시보드 카드, 카드 클릭 이동, 빈 상태, 다크 테마 일관성, 모바일 레이아웃, Disclaimer 표시 확인
- [ ] T021 quickstart.md Watchlist CRUD + API 연결 체크리스트 수행 — pytest 전체 통과, 종목 추가/삭제 UI 동작, 중복·한도 에러 메시지 표시 확인

---

## 의존 관계 및 실행 순서

### 단계별 의존 관계

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작 가능 ✅ 완료
- **Foundational (Phase 2)**: Phase 1 완료 후 — 모든 스토리를 블로킹 ✅ 완료
- **US-001 (Phase 3)**: ✅ 완료
- **US-002 (Phase 4)**: ✅ 완료 (단, Watchlist 추가 UI는 Phase 8에서 처리)
- **US-003 (Phase 5)**: ✅ 완료
- **US-004 (Phase 6)**: ✅ 완료
- **API 검증 (Phase 7)**: T001~T016 완료 후 — T018 → T019 순서
- **Watchlist 추가 UI (Phase 8)**: T018(CORS) 완료 후 — T020 독립 실행 가능
- **마무리 (최종)**: Phase 7, 8 완료 후 T021

### 사용자 스토리 내 실행 순서

```
[기존 완료] T001~T017 ✅

[신규 작업]
T018 (CORS 확인, backend/app/main.py)
  └─► T019 (test_api_connections.py 작성)
  └─► T020 (watchlist/page.tsx 추가 UI)  ← 병렬 가능
        └─► T021 (최종 검증)
```

---

## 병렬 실행 예시

### US-003 Phase 5 — 전부 병렬 실행 가능

```
동시 실행:
  태스크: "WatchlistCard.tsx 다크 테마"
  태스크: "Disclaimer.tsx 다크 테마"
  태스크: "ScoreGauge.tsx 다크 테마"
  태스크: "ScoreTable.tsx 다크 테마"
  태스크: "ChatInterface.tsx 다크 테마"
  태스크: "watchlist/page.tsx 다크 테마"
  태스크: "scores/page.tsx 다크 테마"
  태스크: "stock/[ticker]/page.tsx 다크 테마"
```

### Phase 2 완료 후 병렬 스토리 작업 가능

```
개발자 A: US-001 (T003 → T004)
개발자 B: US-002 (T005 → T006)
개발자 C: US-003 (T007~T014 병렬)
```

---

## 구현 전략

### MVP 우선 (US-001만)

1. Phase 1: Setup 완료 (T001)
2. Phase 2: Foundational 완료 (T002)
3. Phase 3: US-001 완료 (T003, T004)
4. **검증**: 로그인 화면 UX 동작 확인
5. 준비되면 배포/데모

### 점진적 전달

1. Setup + Foundational → 기반 준비 완료
2. US-001 추가 → 로그인 화면 완성 → 배포/데모 (MVP)
3. US-002 추가 → 대시보드 완성 → 배포/데모
4. US-003 추가 → 전체 테마 통일 → 배포/데모
5. US-004 추가 → nav 완성 → 최종 배포
6. 각 스토리는 이전 스토리를 깨뜨리지 않고 가치를 추가

---

## 주의사항

- `[P]` 태스크 = 서로 다른 파일, 의존 관계 없음 → 동시 작업 가능
- `[Story]` 레이블로 태스크↔스토리 추적성 확보
- `layout.tsx`(T015, T016)는 단일 파일 — 병렬 작업 시 충돌 주의
- 각 체크포인트에서 해당 스토리 독립 검증 후 다음 진행
- Disclaimer 컴포넌트는 AI 분석 출력 화면에서 반드시 표시 유지 (Constitution §II)
- **Scope Amendment**: T018, T019는 백엔드 파일 수정/생성, T020은 프론트엔드 수정
- T019 실행 전 백엔드 서버가 `localhost:8000`에서 실행 중이어야 함
- T020에서 `addWatchlist()`, `searchStocks()` 함수는 이미 `api.ts`에 구현되어 있음 — 신규 API 코드 작성 불필요

---

## Scope Amendment (2026-04-22): UX·비용·기능 개선 패키지 (5개 독립 트랙)

> **추가 범위**: 모바일 반응형 / 프롬프트 토큰 절감 / history 행 클릭 / 차트 선 그리기 / 상세 페이지 최근 점수 노출  
> **원칙**: 각 트랙은 독립 사용자 스토리. 기존 완료된 UI(T001~T021)를 깨뜨리지 않음. 데스크톱 경험 불변.

### 사전 결정사항 (2단계에서 확정된 기본값)

| 항목 | 채택안 | 근거 |
|------|--------|------|
| NAV 모바일 변환 | **햄버거 메뉴(상단 오버레이)** | 링크 7개 수용, 화면 상단 일관성, 구현 복잡도 낮음 |
| 프롬프트 문구 | **"4문장 이내 지표 종합 서술 금지 규칙"** 추가 | 점수 산출은 유지, 서술만 압축 |
| 차트 저장 정책 | **localStorage** (`chart_drawings_${ticker}_${market}`) | DB 스키마 무수정, 브라우저별 유지 |
| 최근 점수 API | **신규 `GET /api/v1/history/latest?ticker=&market=`** | 기존 `/today`는 유지 |

---

## Phase 9: 사용자 스토리 5 — 모바일 반응형 UI (우선순위: P1) 🚨 Usability-Blocker

**목표**: 모바일 뷰포트(< 640px)에서 NAV로 모든 페이지 이동 가능 + 주요 페이지 모바일 친화적 레이아웃

**독립 테스트**:
1. iPhone SE(375px)/일반 모바일(390px)에서 햄버거 아이콘 표시 → 탭 시 전체 메뉴 오픈 → 모든 링크 이동 가능
2. 데스크톱(≥ 640px)에서 기존 NAV 레이아웃 **완전 동일** 유지
3. `/dashboard`, `/history`, `/stock/[ticker]` 모바일에서 가로 스크롤 없이 주요 정보 확인 가능
4. 모든 터치 대상이 최소 44×44px 확보

### US-005 구현

- [X] T022 [US5] `frontend/src/app/layout.tsx`에 viewport 메타 태그 추가 — `export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5 }`
- [X] T023 [US5] `frontend/src/components/NavClient.tsx` 햄버거 메뉴 분기 구현 — 모바일(`sm:hidden`) 전용 햄버거 아이콘 + `useState`로 드로어 열기/닫기, 열린 상태일 때 상단 오버레이로 전체 링크 세로 배치, `pathname` 변경 시 자동 닫기, 바디 스크롤 잠금(`overflow-hidden`)
- [X] T024 [US5] `NavClient.tsx` 데스크톱 링크 블록 보존 — 기존 `hidden sm:flex` 유지, 햄버거는 `sm:hidden`으로 분기 (데스크톱 경험 0 변화)
- [X] T025 [P] [US5] `frontend/src/app/(main)/history/page.tsx` 모바일 대응 — 테이블을 `sm:table` 이하에서 카드 리스트로 전환 OR 가로 스크롤 컨테이너(`overflow-x-auto`) 추가, 행 패딩 터치 영역 확보
- [X] T026 [P] [US5] `frontend/src/app/(main)/stock/[ticker]/page.tsx` 모바일 대응 — 차트 높이 모바일 `h-[280px]` 데스크톱 유지, AI 분석 버튼 그룹 `flex-wrap`, 지표 그리드 `grid-cols-2 sm:grid-cols-4` 유지 확인
- [X] T027 [P] [US5] `frontend/src/app/(main)/dashboard/page.tsx` 모바일 점검 — 이미 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` 이므로 터치 영역 및 폰트 가독성만 확인

**체크포인트**: 375px 뷰포트에서 햄버거로 모든 페이지 이동 가능 + 데스크톱 레이아웃 무변화

---

## Phase 10: 사용자 스토리 6 — Claude API 프롬프트 토큰 압축 (우선순위: P2)

**목표**: 기술 지표 해설 부분을 4문장 이내 종합 서술로 압축하여 평균 출력 토큰 60-75% 절감

**독립 테스트**:
1. 동일 티커(예: AAPL) 3회 연속 분석 → 각 호출의 `usage.output_tokens` 로그 비교 → 이전 대비 60%+ 감소
2. 분석 결과 본문에 "RSI는 ... MACD는 ... 볼린저밴드는 ..." 같은 지표별 나열 문구 없음
3. 단기/중기/장기 점수(JSON 블록)는 여전히 정상 반환되어 `parse_scores()`가 파싱 성공

### US-006 구현

- [X] T028 [US6] `backend/app/services/claude.py` `SYSTEM_PROMPT` (L14-39)에 "기술 지표 해설 규칙" 섹션 추가 — "이동평균선·RSI·MACD·볼린저밴드·스토캐스틱을 지표별로 나열하지 말고, 모든 지표를 종합하여 현재 추세·모멘텀·변동성·매매 시그널을 총 4문장 이내로 서술하세요. 지표명은 언급 가능하나 '~는 ..., ~는 ...' 식 나열은 금지합니다." 추가. 점수 산출 JSON 블록 지시는 **변경 금지**.
- [X] T029 [US6] `backend/app/services/claude.py` `stream_analysis()`에 토큰 사용량 로깅 추가 — `stream.get_final_message()` 또는 SDK 제공 방식으로 `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens`를 `logger.info("Claude 토큰 사용: input=%d, output=%d, cache_read=%d, ticker=%s")` 형태로 기록
- [ ] T030 [US6] 수동 검증 — AAPL, RKLB, TSLA 각 1회씩 분석 실행 후 로그에서 output_tokens 확인. 평균이 이전 대비 60%+ 감소했는지 확인. 감소가 부족하면 T028 규칙 문구 재조정 *(사용자 수동 실행 필요)*

**Prompt Caching 영향 주석**: SYSTEM_PROMPT 본문 변경 시 `cache_control: ephemeral` 해시가 바뀌어 **첫 호출은 캐시 미스**(5분 TTL 재구축). 이후 호출은 다시 적중. 비용 영향은 5분 내 1회 재계산뿐.

**체크포인트**: 신규 프롬프트로 분석 시 본문이 4문장 내 종합 서술 + 점수 정상 반환 + 토큰 감소 확인

---

## Phase 11: 사용자 스토리 7 — /history 행 전체 클릭 가능 (우선순위: P3)

**목표**: 분석 기록 표의 행 어디를 클릭해도 상세 팝업이 열림

**독립 테스트**:
1. `/history`에서 행의 종목명·점수 배지·날짜 등 어느 셀을 클릭해도 상세 모달 오픈
2. 기존 "자세히" 버튼 클릭도 여전히 동작
3. 행 호버 시 배경색 변경(`hover:bg-white/5`) + 커서 포인터로 클릭 가능 힌트 제공
4. "자세히" 버튼 클릭 시 이중 실행 없음 (stopPropagation 적용)

### US-007 구현

- [X] T031 [US7] `frontend/src/app/(main)/history/page.tsx` 행(`<tr>`) 수정 — `onClick={() => openDetail(item.id)}` 추가, `className`에 `cursor-pointer`와 기존 `hover:bg-white/5 transition-colors` 유지
- [X] T032 [US7] `history/page.tsx` "자세히" 버튼 핸들러에 이벤트 버블링 차단 — `onClick={(e) => { e.stopPropagation(); openDetail(item.id); }}`

**체크포인트**: 행 전체 클릭 가능 + 버튼 중복 호출 없음

---

## Phase 12: 사용자 스토리 8 — 차트 선 그리기 도구 (우선순위: P3)

**목표**: 종목 상세 페이지 차트에서 추세선(2점 직선) + 수평 지지/저항선을 클릭으로 그리고 localStorage에 저장

**독립 테스트**:
1. 차트 상단 툴바에서 "그리기 모드 ON" 토글 → 차트 클릭 2회로 추세선 생성
2. "수평선" 모드에서 1회 클릭으로 수평 지지/저항선 생성 (`createPriceLine()` 활용)
3. "지우기" 버튼으로 모든 선 삭제
4. 새로고침 후에도 해당 티커에 그렸던 선이 복원됨 (localStorage)
5. 차트 리사이즈 시 선이 봉과 어긋나지 않음
6. 그리기 모드 OFF 상태에서는 기존 크로스헤어·툴팁 정상 동작

### US-008 구현

- [X] T033 [US8] `frontend/src/components/StockChart.tsx` 드로잉 상태 추가 — `drawingMode: "off" | "trendline" | "hline"`, `pendingPoint: {time, price} | null`, `lines: DrawingLine[]` (TrendLine은 두 점, HLine은 가격 하나), useRef로 SVG 오버레이 참조
- [X] T034 [US8] `StockChart.tsx` 툴바 UI — 차트 위쪽에 "추세선 / 수평선 / 지우기 / 모드 ON·OFF" 버튼 4개, 활성 모드 강조 스타일
- [X] T035 [US8] `StockChart.tsx` SVG 오버레이 레이어 — `chartContainerRef` 위에 `position:absolute` SVG, 차트 canvas와 동일 크기, `pointer-events` 모드에 따라 토글, `chart.timeScale().timeToCoordinate()` + `candleSeries.priceToCoordinate()`로 좌표 변환, 추세선은 `<line>` 요소로 렌더
- [X] T036 [US8] `StockChart.tsx` 클릭 핸들러 — 드로잉 모드 ON일 때 SVG `onClick`에서 `e.offsetX/Y` → `chart.timeScale().coordinateToTime()` + `candleSeries.coordinateToPrice()`로 논리 좌표 변환 → `trendline` 모드는 2번째 클릭에서 line 추가, `hline` 모드는 `candleSeries.createPriceLine({price, color, lineWidth, title})` 호출
- [X] T037 [US8] `StockChart.tsx` localStorage 저장 — `lines` state 변경 시 `localStorage.setItem("chart_drawings_${ticker}_${market}", JSON.stringify(lines))`, 마운트 시 복원. 저장 포맷은 논리 좌표(time, price)만 — 렌더 시 좌표 변환 재수행 → 리사이즈 자동 대응
- [X] T038 [US8] `StockChart.tsx` 리사이즈 대응 — 기존 `handleResize`에서 SVG 크기 업데이트 + 모든 선의 좌표 재계산 트리거 (state 의존 useEffect로 재렌더)

**주의**: 기존 크로스헤어·툴팁 로직(L248-325) 보존. 드로잉 모드 OFF일 때 SVG `pointer-events:none`으로 기존 인터랙션 방해 금지.

**체크포인트**: 2가지 선 그리기 + 저장/복원 + 리사이즈 무붕괴 + 기존 차트 기능 무손상

---

## Phase 13: 사용자 스토리 9 — 상세 페이지 최근 분석 점수·날짜 기본 노출 (우선순위: P2)

**목표**: 개별 종목 상세 페이지의 AI 기술적 분석 Div 상단에 **가장 최근** 분석(날짜 무관)의 단기/중기/장기 점수 + 날짜를 기본 표시

**독립 테스트**:
1. RKLB 등 분석 기록 있는 종목 진입 → 페이지 로드 직후 단·중·장기 점수 + "YYYY-MM-DD HH:mm KST" 날짜 배지 표시
2. 분석 기록 없는 종목(검색 후 첫 진입) → "아직 분석된 기록이 없습니다" 플레이스홀더
3. 새 AI 분석 실행 후 → 해당 분석 점수로 UI 업데이트됨
4. 오늘 기록이 없더라도 가장 최근 1건을 표시 (기존 `/today`와 동작 차이 확인)

### US-009 구현

- [X] T039 [US9] `backend/app/routers/history.py` 신규 엔드포인트 — `GET /api/v1/history/latest?ticker=&market=` — `analysis_type='stock'` 필터, `user_id` 일치, 날짜 무관 최신 1건을 `HistoryDetail`로 반환, 없으면 `null` (200 + null body)
- [X] T040 [US9] `frontend/src/services/api.ts` `getLatestScore(token, ticker, market): Promise<HistoryDetail | null>` 신규 함수 추가 (실패 시 null 반환)
- [X] T041 [US9] `frontend/src/app/(main)/stock/[ticker]/page.tsx` 수정 — 기존 `getTodayScore` 호출부를 `getLatestScore`로 교체, `analyzedAt: string | null` state 추가, 응답의 `created_at`을 KST `YYYY-MM-DD HH:mm` 포맷으로 배지 렌더 (예: "최근 분석: 2026-04-20 14:30"), `buyScore === null`일 때 AI 분석 Div 상단에 "아직 분석된 기록이 없습니다" 플레이스홀더
- [X] T042 [US9] `stock/[ticker]/page.tsx` — 새 AI 분석 완료 후(`event.type === "saved"`) `analyzedAt`을 현재 시각으로 업데이트하여 배지 즉시 반영

**체크포인트**: 기록 있는 종목에서 진입 즉시 최근 점수·날짜 표시 + 기록 없는 종목은 플레이스홀더

---

## Phase 14: 마무리 및 검증 (Scope Amendment)

- [X] T043 quickstart.md에 5트랙 검증 체크리스트 추가 — 모바일 NAV(375px) / 프롬프트 토큰 절감 / history 행 클릭 / 차트 그리기 / 최근 점수 표시 각 독립 테스트 항목
- [ ] T044 데스크톱 회귀 테스트 — 1280px/1920px에서 기존 UI 변화 없음 확인, 기존 차트 크로스헤어·툴팁 정상, 기존 /history 버튼 정상 *(사용자 수동 실행 필요)*
- [ ] T045 모바일 실기 테스트 — 크롬 DevTools 디바이스 모드 iPhone SE/Pixel 5, 각 페이지 NAV·터치 영역 확인 *(사용자 수동 실행 필요)*

---

## 팔로업 이슈 (2026-04-22 구현 후)

- [ ] **햄버거 드로어 배경색 조정** — 현재 `bg-slate-950/95` 배경이 너무 투명해 글자 시인성이 낮음. 솔리드에 가까운 어두운 톤(예: `bg-slate-900` + 그라데이션 또는 `bg-[#0b1120]`)으로 변경 필요. 파일: `frontend/src/components/NavClient.tsx` 모바일 드로어 블록.

---

## Scope Amendment 의존 관계

```
T022 (viewport 메타)
  └─► T023 (NavClient 햄버거)
        └─► T024 (데스크톱 보존)
              └─► T025 [P] /history 모바일
              └─► T026 [P] /stock 모바일
              └─► T027 [P] /dashboard 점검

T028 (프롬프트 수정)
  └─► T029 (토큰 로깅) ← 병렬 가능
        └─► T030 (수동 검증)

T031 (행 onClick)
  └─► T032 (버튼 stopPropagation)

T033 (드로잉 state)
  └─► T034 (툴바)
        └─► T035 (SVG 오버레이)
              └─► T036 (클릭 핸들러)
                    └─► T037 (localStorage)
                          └─► T038 (리사이즈 대응)

T039 (backend /latest)
  └─► T040 (api.ts getLatestScore)
        └─► T041 (stock 페이지 연동)
              └─► T042 (saved 이벤트 반영)

T043~T045 (검증): 위 모든 트랙 완료 후
```

## Scope Amendment 병렬 실행 예시

```
개발자 A: US-005 모바일 (T022→T023→T024, 그 후 T025/T026/T027 병렬)
개발자 B: US-006 프롬프트 (T028→T029→T030)
개발자 C: US-007 history 클릭 (T031→T032) [매우 짧음]
개발자 D: US-008 차트 그리기 (T033→...→T038) [가장 큰 작업]
개발자 E: US-009 최근 점수 (T039→T040→T041→T042)

5트랙 동시 진행 가능 — 파일 중복은 `stock/[ticker]/page.tsx`(US-008 StockChart 편집 없음,
US-009만 수정)와 `NavClient.tsx`(US-005만)로 제한적
```

## Scope Amendment MVP 전략

1. **먼저 US-005 (모바일 NAV)** — 모바일 사용자 **완전 블로킹** 이슈. 최우선 배포.
2. 이어 **US-009 (최근 점수)** — 사용성 개선, 구현 경량.
3. **US-007 (행 클릭)** — 10분 작업. 자투리로 처리.
4. **US-006 (프롬프트)** — 비용 개선, 백엔드 수정만. 측정 필요.
5. **US-008 (차트 그리기)** — 가장 큰 작업. 마지막 배포.
