# Quickstart: UI 재편 구현 가이드

**Feature**: 002-ui-redesign  
**Date**: 2026-04-19

---

## 전제 조건

- Node.js 18+, npm 설치됨
- `frontend/.env.local` 설정 완료 (NEXTAUTH_SECRET, Google/Kakao OAuth)
- 백엔드 서버 실행 중 (`uvicorn app.main:app --reload --port 8000`)

---

## 개발 환경 시작

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## 변경 파일 목록

### 새로 생성할 파일

| 파일 | 설명 |
|------|------|
| `src/app/login/page.tsx` | 로그인 전용 페이지 (OAuth 버튼) |
| `src/app/dashboard/page.tsx` | 인증 후 메인 대시보드 |
| `src/components/DashboardCard.tsx` | 관심 종목 카드 컴포넌트 |
| `src/components/GradientButton.tsx` | 재사용 그라디언트 버튼 |

### 수정할 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/globals.css` | 다크 배경(`bg-slate-950`) 기본값 추가 |
| `src/app/layout.tsx` | 다크 테마 nav 재디자인, 사용자 상태 표시 |
| `src/app/page.tsx` | 세션 기반 리다이렉트 (login / dashboard) |
| `src/components/WatchlistCard.tsx` | 글래스 카드 디자인 적용 |
| `src/components/Disclaimer.tsx` | 다크 테마 적용 |
| `src/components/ScoreGauge.tsx` | 다크 테마 적용 |
| `src/components/ScoreTable.tsx` | 다크 테마 테이블 스타일 |

### 기존 유지 (기능 변경 없음)

- `src/services/api.ts` — API 호출 로직 그대로
- `src/types/index.ts` — 타입 정의 그대로
- `src/app/watchlist/page.tsx` — 기능 유지, 스타일만 변경
- `src/app/scores/page.tsx` — 기능 유지, 스타일만 변경
- `src/app/stock/[ticker]/page.tsx` — 기능 유지, 스타일만 변경
- `src/app/chat/page.tsx` — 기능 유지, 스타일만 변경

---

## 구현 순서 (권장)

### Step 1: 디자인 기반 설정
1. `globals.css` — body 기본 다크 배경
2. `layout.tsx` — nav 재디자인 (글래스 + 그라디언트 로고)

### Step 2: 라우팅 흐름 변경
3. `app/page.tsx` — 서버컴포넌트로 변환, 세션 기반 redirect
4. `app/login/page.tsx` — 신규: 로그인 화면

### Step 3: 대시보드
5. `components/DashboardCard.tsx` — 신규: 종목 카드
6. `app/dashboard/page.tsx` — 신규: 대시보드

### Step 4: 공통 컴포넌트 스타일 업데이트
7. `components/GradientButton.tsx` — 신규: 공통 버튼
8. `components/WatchlistCard.tsx` — 다크 테마 적용
9. `components/Disclaimer.tsx` — 다크 테마 적용
10. `components/ScoreGauge.tsx`, `ScoreTable.tsx` — 다크 테마 적용

---

## 핵심 구현 패턴

### 서버사이드 세션 리다이렉트 (page.tsx)

```tsx
// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
```

### 글래스 카드 패턴

```tsx
<div className="
  bg-white/5 backdrop-blur-md 
  border border-white/10 rounded-2xl p-5
  hover:bg-white/10 hover:border-purple-500/50 
  hover:shadow-xl hover:shadow-purple-500/10
  transition-all duration-300 cursor-pointer
">
  {/* 카드 내용 */}
</div>
```

### 그라디언트 텍스트 패턴

```tsx
<span className="
  bg-gradient-to-r from-purple-400 to-blue-400 
  bg-clip-text text-transparent font-bold
">
  StockAI
</span>
```

### 병렬 데이터 로딩 (dashboard/page.tsx)

```tsx
const [watchlistRes, scoresRes] = await Promise.allSettled([
  getWatchlist(token),
  getScoreRanking(token, true, "total"),
]);

const watchlist = watchlistRes.status === "fulfilled" 
  ? watchlistRes.value.items : [];
const scoreMap = scoresRes.status === "fulfilled"
  ? Object.fromEntries(scoresRes.value.items.map(s => [s.ticker, s]))
  : {};
```

---

## API 연결 테스트 실행

```bash
# 백엔드 서버 먼저 실행
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate.bat
uvicorn app.main:app --reload --port 8000

# 다른 터미널에서 테스트 실행
cd backend
pytest tests/test_api_connections.py -v
```

**예상 결과:**
```
PASSED test_health
PASSED test_stock_search
PASSED test_stock_price
PASSED test_stock_indicators
PASSED test_market_summary
PASSED test_watchlist_requires_auth    # 401 반환 확인
PASSED test_auth_verify_invalid_token  # 401/403 반환 확인
```

---

## 관심 종목 추가 UI 테스트

1. `http://localhost:3000/watchlist` 접속
2. 상단 검색창에 "AAPL" 입력
3. 검색 결과에서 Apple Inc. → "+ 추가" 클릭
4. 목록에 즉시 추가되는지 확인
5. 중복 추가 시 알림 메시지 확인
6. 삭제 버튼 클릭 → 목록에서 제거 확인

---

## 테스트 체크리스트

### UI / UX
- [ ] 비로그인 상태에서 `/` 접속 → `/login` 리다이렉트 확인
- [ ] Google 로그인 후 → `/dashboard` 진입 확인
- [ ] Kakao 로그인 후 → `/dashboard` 진입 확인
- [ ] 대시보드: 관심 종목 카드 표시 확인
- [ ] 대시보드: AI 점수 있는 카드 점수 표시 확인
- [ ] 대시보드: 카드 클릭 → 종목 상세 이동 확인
- [ ] 대시보드: 관심 종목 0개일 때 빈 상태 표시 확인
- [ ] 로그인 상태에서 `/login` 접속 → `/dashboard` 리다이렉트 확인
- [ ] 모든 페이지 다크 테마 일관성 확인
- [ ] 모바일(375px) 레이아웃 확인
- [ ] Disclaimer 컴포넌트 AI 분석 화면에 표시 확인 (Constitution §II)

### Watchlist CRUD
- [ ] `/watchlist` 페이지 상단에 검색창이 표시됨
- [ ] 종목 검색 결과가 드롭다운으로 표시됨
- [ ] 이미 추가된 종목은 "추가됨" 뱃지 표시
- [ ] "+ 추가" 클릭 시 목록에 즉시 반영됨
- [ ] 중복 추가 시 409 에러 메시지 표시됨
- [ ] 30개 초과 시 400 에러 메시지 표시됨
- [ ] 삭제 버튼 클릭 시 목록에서 제거됨

### API 연결
- [ ] `pytest tests/test_api_connections.py -v` 전체 통과
- [ ] `/health` → 200 응답
- [ ] `/api/v1/stocks/search?q=AAPL` → 200 + 검색 결과 반환
- [ ] `/api/v1/watchlist` (토큰 없음) → 401/403 반환

---

## Scope Amendment (2026-04-22) 검증 체크리스트

### US-005 모바일 반응형 (375px 뷰포트)
- [ ] Chrome DevTools iPhone SE(375px) 모드에서 상단 햄버거 아이콘 노출
- [ ] 햄버거 탭 → 전체 링크 세로 드로어 오픈, 배경 스크롤 잠김
- [ ] 링크 탭 시 해당 페이지 이동 + 드로어 자동 닫힘
- [ ] `/dashboard`, `/history`, `/stock/AAPL` 각 페이지에서 가로 스크롤 없이 주요 정보 노출 (테이블만 내부 스크롤 허용)
- [ ] 데스크톱(≥ 640px)에서 햄버거 숨겨짐 + 기존 NAV 그대로

### US-006 프롬프트 토큰 절감
- [ ] AAPL 분석 후 백엔드 로그에서 `Claude 토큰 사용: input=..., output=...` 관찰됨
- [ ] `output_tokens` 이전 대비 60%+ 감소 (주관 판단 가능)
- [ ] 분석 본문에 "RSI는 ...이고, MACD는 ..." 지표별 나열 문구 없음
- [ ] JSON 점수 블록은 여전히 정상 파싱됨

### US-007 /history 행 클릭
- [ ] 행의 종목명·점수·날짜 등 어느 셀 클릭도 상세 모달 오픈
- [ ] "자세히" 버튼 단독 클릭도 정상 동작 (중복 호출 없음)
- [ ] 행 호버 시 배경색 변경 + 커서 포인터 표시

### US-008 차트 선 그리기
- [ ] "추세선" 모드 → 차트 2회 클릭으로 직선 생성
- [ ] "수평선" 모드 → 차트 1회 클릭으로 가격선 생성 (오른쪽 축에 라벨)
- [ ] "전체 지우기" → 모든 선 사라짐
- [ ] 페이지 새로고침 후에도 이전 선 복원됨 (같은 ticker/market)
- [ ] 다른 ticker로 이동 시 해당 ticker의 저장된 선만 노출
- [ ] 윈도우 리사이즈 후에도 선이 봉과 같은 논리 좌표에 유지됨
- [ ] 모드 OFF 상태에서 크로스헤어·툴팁 정상 동작

### US-009 최근 분석 점수 배지
- [ ] 분석 기록 있는 종목(예: RKLB) 진입 → 즉시 단/중/장기 점수 + "최근 분석: YYYY-MM-DD HH:mm KST" 배지 노출
- [ ] 기록 없는 종목 진입 → "아직 분석된 기록이 없습니다" 플레이스홀더
- [ ] 새 AI 분석 완료 후 배지가 현재 시각으로 즉시 갱신됨
- [ ] 오늘 기록이 없는 종목에서도 과거 최신 기록이 표시됨 (기존 `/today`와 차이 확인)

### 데스크톱 회귀 (1280px / 1920px)
- [ ] NAV 레이아웃·링크 배치 변화 없음
- [ ] /history 테이블 기존 동일
- [ ] /stock/[ticker] 차트 크로스헤어·툴팁·범례 기존 동일
- [ ] AI 분석 요청 / ScoreGauge / Disclaimer 기존 동일
