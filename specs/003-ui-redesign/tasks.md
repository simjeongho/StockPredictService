---

description: "Task list — 003-ui-redesign 모바일 UI 세부 개선"
---

# Tasks: 003-ui-redesign (모바일 UI 세부 개선)

**Input**: Design documents from `/specs/003-ui-redesign/`
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), quickstart.md (✅)
**Tests**: 본 피처는 순수 프론트엔드 UI 튜닝이며 수동 시각 검증만 요구됨. 자동화 테스트 작성 없음.

**Organization**: 5개 User Story(US1~US5) 각각 독립 단위로 구현·검증 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 서로 다른 파일 수정으로 병렬 실행 가능
- **[Story]**: US1(드로어) / US2(점수 중앙) / US3(뱃지) / US4(토글) / US5(차트 툴팁)
- 모든 경로는 레포 루트 기준 상대경로

---

## Phase 1: Setup

**Purpose**: 개발 환경 확인 (신규 의존성·구조 변경 없음)

- [ ] T001 `frontend/` 디렉터리에서 `npm install && npm run dev` 실행하여 localhost:3000 부팅 확인 (신규 패키지 추가 없음)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 없음. 본 피처는 독립적 UI 수정들로 구성되어 있어 공통 차단 작업이 없다. 5개 User Story가 Setup 완료 후 즉시 병렬 진행 가능.

**Checkpoint**: Setup 완료 시 즉시 US1~US5 병렬 착수 가능.

---

## Phase 3: User Story 1 - 햄버거 드로어 배경 불투명화 (Priority: P1) 🎯 MVP

**Goal**: 모바일 햄버거 드로어 열림 시 뒤 콘텐츠가 비치지 않도록 완전 불투명 배경으로 교체, 브랜드 톤 보존용 그라디언트 엣지 추가.

**Independent Test**: Chrome DevTools iPhone SE(375px) 뷰포트에서 `/dashboard` 카드 가득 찬 상태 → 햄버거 탭 → 드로어 뒤 카드가 전혀 보이지 않고 메뉴 링크 글자가 명확히 읽히는지 확인.

### Implementation for User Story 1

- [X] T002 [US1] `frontend/src/components/NavClient.tsx` 모바일 드로어 루트 `<div>`의 클래스에서 `bg-slate-950/95 backdrop-blur-md`를 `bg-slate-950`로 교체하고 상단 내부에 `before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-12 before:bg-gradient-to-b before:from-purple-500/10 before:to-transparent before:pointer-events-none` 의사 엘리먼트 추가
- [X] T003 [US1] `frontend/src/components/NavClient.tsx` 드로어 오픈 상태에서 기존 `document.body.classList.add("overflow-hidden")` / pathname 변경 시 자동 닫힘 로직이 회귀 없이 유지되는지 코드상 확인 (변경 없음 — 기존 useEffect 그대로)

**Checkpoint**: iPhone SE/Galaxy S25 Edge 뷰포트에서 드로어 열었을 때 뒤 배경 완전 차단, 브랜드 보라 엣지 은은하게 보임, 배경 스크롤 잠금 유지.

---

## Phase 4: User Story 2 - AI 점수 게이지 중앙 정렬 (Priority: P1)

**Goal**: 종목 상세 페이지의 단기/중기/장기 ArcGauge 3개를 모바일에서도 화면 수평 중앙에 대칭으로 배치.

**Independent Test**: 모바일 375px 뷰포트에서 AAPL 분석 완료 → 3개 게이지가 가로 스크롤 없이 한 행에 중앙 대칭 정렬되는지 확인. 데스크톱 1280px에서는 기존 112px 게이지와 세로 구분선이 유지됨.

### Implementation for User Story 2

- [X] T004 [US2] `frontend/src/components/ScoreGauge.tsx` ArcGauge 3개를 감싸는 컨테이너 `flex justify-around px-4 py-6 bg-white/[0.02]`를 `grid grid-cols-3 px-2 sm:px-4 py-6 bg-white/[0.02]`로 교체하고, 기존 `<div className="w-px bg-white/5" />` 세로 구분선 엘리먼트 2개를 제거
- [X] T005 [US2] `frontend/src/components/ScoreGauge.tsx` 각 ArcGauge 래퍼에 `flex items-center justify-center border-r border-white/5` 추가 (마지막 셀은 border-r 생략) 하여 구분선 시각 복원
- [X] T006 [US2] `frontend/src/components/ScoreGauge.tsx` ArcGauge 내부 SVG 컨테이너를 `w-24 h-24 sm:w-28 sm:h-28` + viewBox 스케일링으로, 라벨 텍스트를 `text-[10px] sm:text-xs` / 점수 `text-xl sm:text-2xl` / 라벨 뱃지 `text-[11px] sm:text-xs`로 반응형 분기
- [X] T007 [US2] `frontend/src/app/(main)/stock/[ticker]/page.tsx` ScoreGauge 섹션 래퍼 확인 — 기존 래퍼가 이미 `w-full` 유지, 고정 `max-w-*` 없음 (변경 없음)

**Checkpoint**: 360/375/412px 뷰포트에서 게이지 3개가 완전 중앙 대칭(좌우 여백 차이 ≤ 8px), 라벨 줄바꿈 없음, 데스크톱 1280px에서는 기존 구분선·크기 그대로.

---

## Phase 5: User Story 3 - /history 뱃지 한 줄 고정 (Priority: P2)

**Goal**: 분석 기록 테이블의 모든 뱃지(비교/종목/중립/매수고려/매수/매도)가 어떤 셀 폭에서도 줄바꿈 없이 한 줄로 표시.

**Independent Test**: `/history`에 여러 유형·점수의 기록이 있는 상태로 모바일 375px 뷰포트 진입 → 모든 뱃지가 한 줄 유지, 셀 폭 초과 시 테이블 가로 스크롤로 흡수되는지 확인.

### Implementation for User Story 3

- [X] T008 [P] [US3] `frontend/src/app/(main)/history/page.tsx`의 `TypeBadge` 컴포넌트 루트 `<span>`의 className에 `whitespace-nowrap inline-flex items-center` 추가
- [X] T009 [P] [US3] `frontend/src/app/(main)/history/page.tsx`의 `ScoreBadge` 컴포넌트 루트 `<span>`의 className에 `whitespace-nowrap inline-flex items-center` 추가

**Checkpoint**: 360px~1920px 전 구간에서 뱃지 줄바꿈 0건.

---

## Phase 6: User Story 4 - /scores 토글 4개 모바일 한 화면 (Priority: P2)

**Goal**: `/scores` 페이지 상단 정렬 토글 4개(단기/중기/장기/종합)가 모바일 360px에서 가로 스크롤 없이 한 행에 배치.

**Independent Test**: 360px 뷰포트에서 `/scores` 진입 → 4개 토글이 모두 한 행에 보이고 가로 스크롤 없음, 터치 타겟 세로 ≥ 36px. 데스크톱 ≥ 640px에서는 기존 풀 라벨("단기 (1주)" 등) + flex 레이아웃 유지.

### Implementation for User Story 4

- [X] T010 [US4] `frontend/src/components/ScoreTable.tsx`의 `SORT_TABS` 배열 각 항목에 `shortLabel` 필드 추가: 단기/중기/장기/종합 (기존 label은 그대로 유지)
- [X] T011 [US4] `frontend/src/components/ScoreTable.tsx` 토글 컨테이너 래퍼 `<div>`의 className을 `grid grid-cols-4 gap-1.5 sm:flex sm:gap-2 sm:overflow-visible`로 교체
- [X] T012 [US4] `frontend/src/components/ScoreTable.tsx` 각 토글 `<button>`의 className을 `px-2 py-2 sm:px-4 sm:py-1.5 text-xs sm:text-sm` 기반으로 조정, 버튼 내부 텍스트를 `<span className="sm:hidden">{tab.shortLabel}</span><span className="hidden sm:inline">{tab.label}</span>` 구조로 분기

**Checkpoint**: 360px에서 4개 토글 한 행 + 가로 스크롤 없음, 데스크톱 1280px에서 기존 UX 회귀 없음.

---

## Phase 7: User Story 5 - 차트 그린 선 hover/터치 가격 툴팁 (Priority: P3)

**Goal**: 추세선·수평선 위에 마우스 호버 또는 터치 시 해당 위치의 가격을 툴팁으로 표시.

**Independent Test**: 차트에 추세선 1개 생성 → 데스크톱 마우스 호버 / 모바일 터치 시 `$123.45` 형태 툴팁이 100ms 이내 표시되고 x좌표 이동에 따라 선형 보간된 가격이 갱신되는지 확인. 드로잉 OFF 시 기존 봉 크로스헤어 회귀 없음.

### Implementation for User Story 5

- [X] T013 [US5] `frontend/src/components/StockChart.tsx`에 `hoverTooltip` 상태 추가: `useState<{ x: number; y: number; price: number } | null>(null)`
- [X] T014 [US5] (편차) SVG 히트박스 대신 window-level `mousemove`/`touchmove` 리스너 채택 — SVG `pointer-events: none` 상속으로 자식 히트박스가 OFF 모드에서 이벤트를 받지 못하는 구조적 제약 회피. 효과는 동등 (픽셀 히트박스 ±8px)
- [X] T015 [US5] `frontend/src/components/StockChart.tsx`에 `computeHit(x, y)` 함수 구현: `chart.timeScale().timeToCoordinate()` + `candleSeries.priceToCoordinate()`로 추세선 엔드포인트 픽셀화 → 선형 보간으로 커서 y 산출 → `candleSeries.coordinateToPrice()`로 가격 환산 → `setHoverTooltip(...)`
- [X] T016 [US5] 수평선도 동일 `computeHit` 루프에서 처리: `priceToCoordinate(line.price)`로 Y 산출, ±8px 히트 시 고정 `line.price`를 툴팁에 세팅
- [X] T017 [US5] 툴팁 렌더 `<div>` 추가: `className="absolute pointer-events-none px-2 py-1 rounded-md bg-slate-900/95 border border-purple-500/40 text-xs font-semibold text-purple-200 shadow-lg shadow-purple-500/20"`, 포맷 US=`$price.toFixed(2)` / KR=`₩price.toLocaleString("ko-KR")`
- [X] T018 [US5] 터치 대응: window `touchmove`(passive) 리스너에서 `touch.clientX/clientY` → 컨테이너 `getBoundingClientRect()` 로컬 좌표 변환, `touchend` + `mouseleave`에서 `setHoverTooltip(null)`
- [X] T019 [US5] window-level 리스너는 drawingMode 무관 항상 활성 — 단 `computeHit`가 `lines` 배열(그려진 선) 기반이므로 드로잉 OFF + 선 0개 상태에서는 자연히 툴팁 없음. 기존 차트 크로스헤어는 `chartContainerRef` 내부 동작 그대로 유지 (리스너 charging 충돌 없음)

**Checkpoint**: 추세선·수평선 호버/터치 시 100ms 이내 가격 툴팁 노출, 드로잉 OFF 상태에서 봉 크로스헤어 기존 동작 그대로.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 수동 검증 및 데스크톱 회귀 테스트

- [ ] T020 `specs/003-ui-redesign/quickstart.md` 체크리스트 전체 수행: 360/375/412px 모바일 + 1280/1920px 데스크톱 뷰포트
- [ ] T021 Galaxy S25 Edge 실기기에서 5개 User Story 체크리스트 통과 확인 (세로/가로 회전 포함)
- [ ] T022 데스크톱 1280px/1920px 회귀 확인: `/dashboard`, `/history`, `/scores`, `/stock/[ticker]`, 햄버거 숨김, ArcGauge 기존 112px 유지, 차트 기존 크로스헤어 동작
- [ ] T023 Constitution 비회귀 확인: Disclaimer 컴포넌트 AI 분석 결과 화면 노출(§II), 백엔드 API/토큰 로직 무변경(§V), 접근성 포커스·대비(§VI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작 가능
- **Foundational (Phase 2)**: 없음
- **User Stories (Phase 3~7)**: Setup 완료 후 5개 모두 병렬 착수 가능 (서로 독립)
- **Polish (Phase 8)**: US1~US5 완료 후 수행

### User Story Dependencies

- **US1 (드로어)**: NavClient.tsx 단독 수정 — 타 US와 독립
- **US2 (점수 중앙)**: ScoreGauge.tsx + stock/[ticker]/page.tsx — 타 US와 독립
- **US3 (뱃지)**: history/page.tsx 단독 수정 — 타 US와 독립
- **US4 (토글)**: ScoreTable.tsx 단독 수정 — 타 US와 독립
- **US5 (차트 툴팁)**: StockChart.tsx 단독 수정 — 타 US와 독립

### Within Each User Story

- US1: T002 → T003 (같은 파일 순차)
- US2: T004 → T005 → T006 (같은 파일 순차) → T007 (다른 파일, 선택)
- US3: T008, T009 병렬 가능 (같은 파일이지만 서로 다른 컴포넌트 선언부)
- US4: T010 → T011 → T012 (같은 파일 순차)
- US5: T013 → T014 → T015 → T016 → T017 → T018 → T019 (같은 파일 순차, 상태·오버레이·핸들러·툴팁·터치·OFF 모드 순)

### Parallel Opportunities

- Phase 3~7 **전체가 서로 다른 파일**이므로 5명이 동시 작업 가능
- Phase 8 T020~T022는 각 뷰포트 독립 → 병렬 가능

---

## Parallel Example: 5개 User Story 동시 진행

```bash
# Setup 완료 후, 5명이 동시에 작업:
Developer A: Phase 3 US1 (NavClient.tsx)
Developer B: Phase 4 US2 (ScoreGauge.tsx + stock page)
Developer C: Phase 5 US3 (history/page.tsx)
Developer D: Phase 6 US4 (ScoreTable.tsx)
Developer E: Phase 7 US5 (StockChart.tsx)
```

단일 개발자라면 Priority(P1→P2→P3) + 복잡도(쉬움→어려움) 순: US1 → US3 → US2 → US4 → US5.

---

## Implementation Strategy

### MVP First (US1 + US2만)

1. Phase 1 Setup
2. Phase 3 US1 (햄버거 드로어) — 가장 빠른 모바일 시인성 개선
3. Phase 4 US2 (점수 중앙 정렬) — 핵심 UI 결함 해결
4. **STOP & VALIDATE**: Galaxy S25 Edge에서 드로어·점수만 확인, 즉시 배포

### Incremental Delivery

1. Setup + US1 → 배포 (드로어 가독성 즉시 개선)
2. + US3 뱃지 → 배포 (테이블 가독성)
3. + US4 토글 → 배포 (/scores 모바일 개선)
4. + US2 점수 중앙 → 배포 (AI 점수 핵심 UX)
5. + US5 차트 툴팁 → 배포 (전문 기능 정교화)

### Parallel Team Strategy

Setup 완료 후 5명 병렬, 각자 단일 파일 수정 → 충돌 없음.

---

## Notes

- 본 피처는 테스트 태스크 없음 (순수 UI 튜닝, 수동 검증). spec.md에서 자동화 테스트를 요구하지 않음.
- 신규 의존성/신규 파일 없음. 기존 7개 파일만 수정.
- US3(T008, T009)은 같은 파일의 서로 다른 컴포넌트 함수 선언부이므로 실제로는 동시 편집 가능하지만 충돌 회피를 위해 순차 수행 권장.
- Constitution §II Disclaimer 컴포넌트는 ScoreGauge 리팩토링 중 실수로 제거되지 않도록 주의.
