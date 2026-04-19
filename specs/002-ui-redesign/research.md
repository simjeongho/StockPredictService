# Research: UI 재편 + Watchlist CRUD + API 연결 테스트

**Feature**: 002-ui-redesign (scope amendment)  
**Date**: 2026-04-19

---

## Decision 0: API 연결 실패 원인 분석

**Decision**: API 실패의 근본 원인은 **백엔드 서버 미실행** 또는 **환경 변수 미설정**이 가장 유력하다. 코드 자체의 API 호출 로직은 정상이다.

**Findings:**
- `frontend/src/services/api.ts`: Axios 기반, `NEXT_PUBLIC_API_BASE_URL` (기본 `http://localhost:8000`) 사용
- 인증 엔드포인트: token을 파라미터로 받아 Authorization 헤더에 직접 주입 — 정상
- 공개 엔드포인트 (search, price, indicators, market): 인증 불필요, 토큰 없이 동작해야 함
- interceptor의 `sessionStorage.getItem("auth_token")`는 dead code (설정하는 코드 없음), 공개 API에 영향 없음

**확인 체크리스트 (우선순위 순):**
1. `backend/.venv` 활성화 + `uvicorn app.main:app --reload --port 8000` 실행 여부
2. `frontend/.env.local`의 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` 설정 여부
3. `backend/app/main.py` CORS origins에 `http://localhost:3000` 포함 여부
4. `backend/.env` 파일에 DB_URL, ANTHROPIC_API_KEY 설정 여부

**Rationale**: API 테스트 스크립트로 체크리스트를 자동화한다.

**Alternatives Considered**: 전체 API 코드 재작성 — 불필요, 기존 코드 구조 정상

---

## Decision 0b: 관심 종목 추가 UI 위치

**Decision**: `/watchlist` 페이지 상단에 검색 + 추가 패널을 인라인으로 배치한다.

**Findings:**
- `/watchlist` 페이지: 삭제 기능 있음, **추가 기능 없음** (핵심 누락)
- `/dashboard`: "종목 검색하기" → `/watchlist` 링크 있음 (올바른 유도)
- `api.ts`: `addWatchlist(token, ticker, market, display_name)` + `searchStocks(q, market)` 이미 구현됨

**UX 흐름**: 검색창 입력 → 300ms 디바운스 → 결과 드롭다운 → + 추가 클릭 → 목록 즉시 업데이트

**Rationale**: 별도 모달보다 인라인 패널이 더 단순하고 페이지 이탈이 없다.

**Alternatives Considered**: 모달, 별도 페이지, 대시보드 배치 — 모두 불필요한 복잡성으로 기각

---

## Decision 0c: API 테스트 전략

**Decision**: `backend/tests/test_api_connections.py`를 pytest + httpx로 작성. 연결 확인 수준.

**테스트 범위**: `/health`, `search`, `price`, `indicators`, `market/summary` (인증 불필요) + watchlist, verify (401 반환 확인)

**Rationale**: 실제 HTTP 호출 기반 통합 테스트가 "API가 동작하는가"를 가장 정확히 검증한다.

---

## Decision 1: 색상 팔레트

**Decision**: Tailwind CSS 기본 팔레트 + CSS 변수 최소 활용

| 역할 | 값 | Tailwind 클래스 |
|------|-----|----------------|
| 페이지 배경 | #020617 | `bg-slate-950` |
| 카드 배경 | rgba(255,255,255,0.05) | `bg-white/5` |
| Primary gradient | purple-600 → blue-500 | `from-purple-600 to-blue-500` |
| 텍스트 주요 | #f8fafc | `text-slate-50` |
| 텍스트 보조 | #94a3b8 | `text-slate-400` |
| 상승 포인트 | #34d399 | `text-emerald-400` |
| 하락 포인트 | #fb7185 | `text-rose-400` |
| 강조 (cyan) | #22d3ee | `text-cyan-400` |
| 강조 (violet) | #a78bfa | `text-violet-400` |
| 테두리 | rgba(255,255,255,0.1) | `border-white/10` |
| 호버 테두리 | rgba(168,85,247,0.5) | `border-purple-500/50` |

**Rationale**: 추가 CSS 파일 없이 Tailwind 유틸리티만으로 완전 구현 가능.
shadcn/ui, Chakra UI 등 추가 라이브러리 불필요 — Constitution §V (Simplicity) 준수.

**Alternatives considered**:
- shadcn/ui: 이미 구현된 기능에 불필요한 의존성 추가
- CSS Modules: Tailwind 방식과 충돌 가능성, 유지보수 복잡성 증가

---

## Decision 2: 글래스모피즘 구현 방법

**Decision**: Tailwind CSS 유틸리티 조합 — 별도 CSS 클래스 없음

**카드 패턴**:
```
bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl
hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300
```

**Nav 패턴**:
```
bg-slate-950/80 backdrop-blur-md border-b border-white/5
```

**Rationale**: CSS 파일 수정 최소화, Tailwind JIT로 최종 번들에 사용된 클래스만 포함.

---

## Decision 3: 라우팅 흐름

**Decision**:

```
/ (root)
├── 비로그인 → redirect /login
└── 로그인   → redirect /dashboard

/login
└── OAuth 로그인 후 → /dashboard

/dashboard   (NEW)
└── 관심 종목 카드 그리드

/stock/[ticker]  (유지, 디자인 변경)
/watchlist       (유지, 디자인 변경)
/scores          (유지, 디자인 변경)
/chat            (유지, 디자인 변경)
```

**구현 방법**: `page.tsx` (서버 컴포넌트)에서 `getServerSession`으로 세션 확인 후 `redirect()` 사용

**Rationale**: NextAuth.js v5 서버사이드 세션으로 클라이언트 플리커 없이 리다이렉트 가능.
미들웨어(middleware.ts) 대신 페이지 레벨 리다이렉트 — 추후 미들웨어로 이관 용이.

**Alternatives considered**:
- `middleware.ts`: 더 깔끔하지만 현재 구조에서 추가 설정 복잡성 발생
- 클라이언트사이드 리다이렉트: 로그인 화면 깜빡임 발생

---

## Decision 4: 대시보드 카드 데이터 소스

**Decision**: `getWatchlist()` + `getScoreRanking()` 두 API를 병렬 호출, ticker로 조인

**데이터 흐름**:
1. `getWatchlist(token)` → WatchlistItem[] (가격, 등락률)
2. `getScoreRanking(token, watchlist_only=true, sort_by='total')` → ScoreRankingItem[] (AI 점수)
3. watchlist.ticker === score.ticker 매칭으로 카드 데이터 구성
4. score 없는 종목 → 가격 정보만 표시, 점수 칸은 "미분석" 표시

**Rationale**: 새 API 엔드포인트 불필요. 기존 2개 API 조합으로 대시보드 카드에 필요한 모든 정보 제공.
백엔드 변경 없이 순수 프론트엔드로 해결 — Constitution §V (Simplicity) 준수.

---

## Decision 5: 애니메이션 전략

**Decision**: Tailwind CSS transition + CSS `@keyframes` (shimmer)만 사용

**패턴**:
- 카드 호버: `hover:scale-[1.02] hover:shadow-purple-500/20 hover:shadow-xl transition-all duration-300`
- 로딩 스켈레톤: `animate-pulse bg-white/5`
- 버튼 호버: `hover:brightness-110 transition-all`

**Rationale**: Framer Motion 등 추가 패키지 없이 충분한 시각적 효과 달성 가능.
Constitution §V (Simplicity) — 추가 의존성 도입 금지 원칙 준수.

---

## Decision 6: globals.css 변경

**Decision**: 기존 3줄 유지 + 다크 테마 기본값 추가

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-950 text-slate-50;
  }
}
```

**Rationale**: `layout.tsx`에서 클래스로 처리하는 것도 가능하나, body 기본값은 CSS로 설정이 더 안정적.
