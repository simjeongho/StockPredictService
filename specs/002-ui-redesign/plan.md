# Implementation Plan: UI 전면 재편 + Watchlist CRUD + API 연결 테스트

**Branch**: `002-ui-redesign` | **Date**: 2026-04-19 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-ui-redesign/spec.md`

> **Scope Amendment**: 원 spec의 "새로운 기능 추가 없음" 범위를 아래 두 항목으로 확장한다.  
> 1. 관심 종목 추가 UI (watchlist add: 검색 + 추가 버튼) — 기존 `addWatchlist()` API 활용  
> 2. API 연결 상태 확인 스크립트 — 백엔드 개발 환경 검증 목적

---

## Summary

보라/파랑 다크 테마로 프론트엔드를 전면 재편하며, 누락된 **관심 종목 추가 UI**를 구현하고 **모든 API 엔드포인트 연결 테스트**를 추가한다. 백엔드 API는 변경하지 않으며, 기존 `addWatchlist()` 서비스 함수와 `searchStocks()` 함수를 조합해 Watchlist CRUD를 완성한다.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 14 App Router (프론트), Python 3.11 (백엔드 테스트)  
**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS 3, NextAuth.js v5, Axios, pytest, httpx  
**Storage**: PostgreSQL (기존, 변경 없음)  
**Testing**: pytest + httpx (백엔드 API 테스트), 브라우저 수동 확인 (프론트)  
**Target Platform**: 브라우저 (web), localhost dev 환경  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 관심 종목 추가 응답 < 2s, 검색 디바운스 300ms  
**Constraints**: 백엔드 API 변경 없음, 관심 종목 최대 30개 제한  
**Scale/Scope**: ~10 사용자, 3개 페이지 수정 + 1개 테스트 파일 신규 추가

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Data Integrity First | ✅ PASS | 검색 결과 / 현재가는 기존 yfinance·FDR 검증 로직 그대로 사용 |
| II. Prediction Transparency | ✅ PASS | Disclaimer 컴포넌트 유지, 새 UI에도 포함 |
| III. User Accessibility | ✅ PASS | 검색어 입력 → 결과 목록 → 추가 버튼의 단계적 흐름, 비전문가 친화적 |
| IV. Incremental Value Delivery | ✅ PASS | 관심 종목 추가 UI는 독립 배포 가능한 슬라이스 |
| V. Simplicity & Maintainability | ✅ PASS | 기존 `searchStocks()`, `addWatchlist()` 재사용, 새 의존성 없음 |
| Data & Privacy | ✅ PASS | 기존 인증·삭제 흐름 변경 없음 |

**Constitution Check Result**: 모든 게이트 통과. Complexity Tracking 불필요.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-redesign/
├── plan.md              # 이 파일
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (변경 없음 — 기존 Watchlist 모델 재사용)
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (기존 계약 재사용, 신규 없음)
```

### Source Code (변경 대상)

```text
frontend/src/
├── app/(main)/
│   ├── watchlist/page.tsx       # [수정] 종목 검색 + 추가 UI 추가
│   └── dashboard/page.tsx       # [현상 유지] 이미 올바른 구조
├── components/
│   └── WatchlistCard.tsx        # [확인] 삭제 버튼 정상 동작 여부 확인
└── services/
    └── api.ts                   # [현상 유지] addWatchlist() 이미 구현됨

backend/
└── tests/
    └── test_api_connections.py  # [신규] 모든 엔드포인트 연결 테스트
```

---

## Phase 0: Research

### R-001: 현재 API 연결 실패 원인 분석

**상황**: 사용자 보고 — 주식 데이터 API들이 전혀 동작하지 않음

**가능한 원인 (우선순위 순):**

| # | 원인 | 확인 방법 |
|---|------|----------|
| 1 | 백엔드 서버 미실행 | `curl http://localhost:8000/health` |
| 2 | `.env.local`의 `NEXT_PUBLIC_API_BASE_URL` 미설정 | `frontend/.env.local` 확인 |
| 3 | CORS — 백엔드 origins에 `localhost:3000` 미포함 | `backend/app/main.py` CORS 설정 확인 |
| 4 | NextAuth 토큰이 `session.accessToken`에 없음 | backend verify 엔드포인트 실패 시 |

**결론**: 백엔드 실행 여부가 최우선 확인 사항. 테스트 스크립트로 자동화.

### R-002: 관심 종목 추가 UI — 어디에 두어야 하나?

**결정**: `/watchlist` 페이지 상단에 검색 + 추가 패널 추가  
**근거**: 이미 "목록 관리" 페이지이며, 대시보드에서 링크로 유도 중  
**대안 검토**: 대시보드에 추가 버튼 → 페이지 역할 분산으로 기각

**UX 흐름**:
```
[검색창 입력] → [300ms 디바운스] → [결과 드롭다운] → [+추가 클릭]
→ addWatchlist() → 목록 즉시 업데이트
```

### R-003: API 테스트 전략

**결정**: `backend/tests/test_api_connections.py` 신규 작성 (pytest + httpx)  
**범위**: 
- 인증 불필요 엔드포인트: health, search, price, indicators, market/summary
- 인증 필요 엔드포인트: watchlist GET (테스트용 JWT 토큰으로 검증)
- 각 엔드포인트: HTTP 200 응답 + 응답 스키마 키 존재 여부 확인

---

## Phase 1: Design & Contracts

### Data Model

기존 `Watchlist` 테이블 및 `WatchlistItem` 타입 그대로 사용. 변경 없음.

```typescript
// 기존 타입 (변경 없음)
interface WatchlistItem {
  ticker: string;
  market: "us" | "kr";
  display_name: string;
  current_price: number;
  change_pct: number;
  volume: number;
}
```

### UI 컴포넌트 설계: WatchlistAddPanel

```text
┌─────────────────────────────────────────────┐
│  [🔍 종목명 또는 티커 검색...]  [마켓: US▼] │  ← 검색창 + 마켓 필터
├─────────────────────────────────────────────┤
│  AAPL  Apple Inc.          US   [+ 추가]    │  ← 검색 결과 드롭다운
│  AMZN  Amazon.com Inc.     US   [+ 추가]    │
│  TSLA  Tesla Inc.          US   [+ 추가]    │
└─────────────────────────────────────────────┘
```

**상태 관리:**
```typescript
const [query, setQuery] = useState("");
const [market, setMarket] = useState<"us" | "kr">("us");
const [results, setResults] = useState<StockSearchResult[]>([]);
const [searching, setSearching] = useState(false);
const [adding, setAdding] = useState<string | null>(null); // 추가 중인 ticker
```

**디바운스**: 300ms 후 `searchStocks(query, market)` 호출  
**추가 성공**: 목록 상태 즉시 업데이트, 검색창 초기화  
**에러 처리**: 중복(409), 한도초과(400), 네트워크 오류 각각 alert

### API 테스트 계획 (`test_api_connections.py`)

```python
# 테스트 케이스 목록
test_health()                        # GET /health → 200
test_stock_search()                  # GET /api/v1/stocks/search?q=AAPL → 200, list
test_stock_price()                   # GET /api/v1/stocks/AAPL/price → 200, has 'candles'
test_stock_indicators()              # GET /api/v1/stocks/AAPL/indicators → 200, has 'rsi'
test_market_summary()                # GET /api/v1/stocks/market/summary → 200, list
test_watchlist_requires_auth()       # GET /api/v1/watchlist (no token) → 401/403
test_auth_verify_invalid_token()     # POST /api/v1/auth/verify (bad token) → 401/403
```

### Quickstart 업데이트

```bash
# 백엔드 실행 확인
cd backend
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
uvicorn app.main:app --reload --port 8000

# API 연결 테스트 실행
pytest tests/test_api_connections.py -v

# 프론트엔드
cd frontend
npm run dev
# → http://localhost:3000/watchlist 에서 종목 추가 테스트
```

---

## Implementation Tasks

### T-001: API 연결 테스트 파일 작성
**File**: `backend/tests/test_api_connections.py`  
**Scope**: 인증 불필요 7개 엔드포인트 + 인증 필요 2개 (401 반환 확인)  
**Dependencies**: pytest, httpx (requirements.txt에 이미 있거나 추가 필요)

### T-002: Watchlist 페이지 — 종목 검색 + 추가 UI 구현  
**File**: `frontend/src/app/(main)/watchlist/page.tsx`  
**Scope**: 검색창, 마켓 필터, 검색 결과 드롭다운, 추가 버튼 추가  
**Dependencies**: 기존 `searchStocks()`, `addWatchlist()` 함수 사용

### T-003: WatchlistCard 삭제 버튼 정상 동작 확인
**File**: `frontend/src/components/WatchlistCard.tsx`  
**Scope**: 삭제 버튼 클릭 시 확인 다이얼로그 + `onRemove()` 호출 흐름 검증

### T-004: 백엔드 CORS 설정 확인
**File**: `backend/app/main.py`  
**Scope**: `localhost:3000`이 허용된 origins에 포함되어 있는지 확인

---

## Complexity Tracking

Constitution 위반 없음 — 해당 없음.

---

## Artifacts Generated

- [x] `specs/002-ui-redesign/plan.md` (이 파일)
- [ ] `specs/002-ui-redesign/research.md` → Phase 0에서 생성
- [ ] `specs/002-ui-redesign/data-model.md` → Phase 1에서 생성 (변경 없음 기록)
- [ ] `specs/002-ui-redesign/quickstart.md` → Phase 1에서 생성
- [ ] `specs/002-ui-redesign/tasks.md` → `/speckit.tasks` 명령으로 생성 예정
