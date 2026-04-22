# Research: 003-ui-redesign

**Date**: 2026-04-22
**Feature**: 모바일 UI 세부 개선 — 5개 이슈 기술 결정 요약

---

## Issue 1 — 햄버거 드로어 배경 (US-1)

### 현재 상태
`frontend/src/components/NavClient.tsx`의 모바일 드로어에 `bg-slate-950/95 backdrop-blur-md` 적용. `/95` alpha로 뒤 배경 5%가 비쳐 보여 카드·표·차트 위에서 메뉴 텍스트 대비가 부족.

### 결정
- 배경 alpha 완전 제거 → `bg-slate-950` (100% 불투명).
- `backdrop-blur-md`는 불투명 배경에서 효과가 없으므로 제거.
- 브랜드 톤 보존: 드로어 상단 내부에 `before:` 의사 엘리먼트로 `from-purple-500/10 to-transparent` 그라디언트 오버레이. 이 레이어는 `pointer-events-none`으로 클릭 방해 없음.
- 테두리는 기존 `border-t border-white/10` 유지.

### 대안 검토
- `bg-slate-900` (한 단계 밝음): 기존 헤더 `bg-slate-950/80`과 톤 불일치 → 기각.
- `bg-black`: 너무 플랫함, 브랜드 다크 톤 이탈 → 기각.

### 변경 파일
- `frontend/src/components/NavClient.tsx`

---

## Issue 2 — /history 뱃지 줄바꿈 (US-3)

### 현재 상태
`frontend/src/app/(main)/history/page.tsx` 내부 `TypeBadge`, `ScoreBadge` 컴포넌트 — 좁은 셀에서 "매수고려" 같은 긴 라벨이 2줄로 줄바꿈.

### 결정
두 뱃지 컴포넌트의 `<span>` 루트에 `whitespace-nowrap inline-flex items-center gap-1` 추가. 이미 `px-2 py-0.5 rounded-full` 존재하므로 한 줄만 보장하면 됨.

### 대안 검토
- 셀 `min-width` 지정: 테이블 전체 폭을 고정시켜 좁은 화면에서 다른 문제 유발 → 기각.
- 반응형 라벨 축약: "매수고려" → "고려" 같은 축약은 의미 혼선 위험 → 기각.

### 변경 파일
- `frontend/src/app/(main)/history/page.tsx` (`TypeBadge`, `ScoreBadge` 각각 1줄 추가)

---

## Issue 3 — /scores 토글 4개 모바일 배치 (US-4)

### 현재 상태
`frontend/src/components/ScoreTable.tsx`의 `SORT_TABS = [{key, label}, ...]` 4개를 `flex gap-1 overflow-x-auto` 렌더. 모바일 360px에서 가로 스크롤 발생.

### 결정
- `label`과 `shortLabel` 두 속성으로 분리:
  - `{ key: "short", label: "단기 (1주)", shortLabel: "단기" }` 형태.
- 렌더 컨테이너를 `flex sm:flex grid grid-cols-4 gap-1.5 sm:gap-2` (모바일 그리드 4열, 데스크톱 기존 flex).
- 버튼 텍스트는 `<span class="sm:hidden">{shortLabel}</span><span class="hidden sm:inline">{label}</span>`.
- 버튼 자체 패딩 `px-2 py-2 sm:px-4 sm:py-1.5 text-xs sm:text-sm` — 모바일 터치 타겟 ≥ 36px 보장 (`py-2` ≈ 8px+8px + 12px line-height = 36px).

### 대안 검토
- `overflow-x-auto` 유지하며 스크롤 힌트 추가: 발견성 저하 유지 → 기각.
- 토글 세로 스택 (1열 4행): 공간 낭비 + 기존 시각 스타일 대변동 → 기각.

### 변경 파일
- `frontend/src/components/ScoreTable.tsx`

---

## Issue 4 — ScoreGauge 모바일 중앙 정렬 (US-2)

### 현재 상태
`frontend/src/components/ScoreGauge.tsx`:
```tsx
<div className="flex justify-around px-4 py-6 bg-white/[0.02]">
  <ArcGauge term="단기 (1주)" ... />   // w-28 h-28 → 112px
  <div className="w-px bg-white/5" />
  <ArcGauge term="중기 (3개월)" ... />
  <div className="w-px bg-white/5" />
  <ArcGauge term="장기 (1년)" ... />
</div>
```
3×112 + 2×1 + padding = ~340px. Galaxy S25 Edge 내부 폭(~328px 외곽 card padding 후)보다 크면 오른쪽으로 쏠림.

### 결정
- 컨테이너를 `grid grid-cols-3 place-items-center gap-0 px-2 sm:px-4 py-6 bg-white/[0.02]`로 변경.
  - `place-items-center`: 각 셀(ArcGauge) 수평·수직 중앙 정렬.
  - `grid-cols-3`: 3등분 — 어떤 폭에서도 좌우 대칭 보장.
- 구분선 `<div className="w-px ...">` 제거 (grid로는 삽입 불가). 대신 각 ArcGauge 래퍼에 `border-r last:border-r-0 border-white/5 w-full` 스타일을 붙여 동등한 시각 구분 복원.
- ArcGauge SVG 크기를 반응형으로 분기:
  - 모바일: `w-24 h-24` (96px)
  - 데스크톱(`sm:`): 기존 `w-28 h-28` (112px).
  - SVG `viewBox`는 그대로 유지 (비율 스케일링).
- 라벨 텍스트: 모바일 `text-[11px]`, 데스크톱 `text-xs` (기존 유지).

### 대안 검토
- 모바일에서만 `flex-col` 세로 스택: 3개 게이지를 상하로 쌓으면 AI 섹션 세로 길이 폭증 → UX 저하 → 기각.
- `overflow-x-auto + snap`: 스크롤 유도는 주요 결과물인 점수를 한 번에 못 보게 함 → 기각.

### 변경 파일
- `frontend/src/components/ScoreGauge.tsx`
- (필요 시) `frontend/src/app/(main)/stock/[ticker]/page.tsx` — ScoreGauge를 감싸는 섹션 너비가 `max-w-xl` 등으로 제약되어 있으면 모바일 `w-full` 보장.

---

## Issue 5 — 차트 그린 선 hover/터치 가격 툴팁 (US-5)

### 현재 상태
`frontend/src/components/StockChart.tsx`:
- 수평선 (HLine): `candleSeriesRef.current.createPriceLine({ price, axisLabelVisible: true })` — 오른쪽 축에 가격 라벨 이미 표시됨.
- 추세선 (TrendLine): SVG `<line>`을 overlay로 그림. 2점(`p1`, `p2`)의 `(time, price)` 로지컬 좌표 저장. `timeToCoordinate()` + `priceToCoordinate()`로 픽셀 변환 후 렌더. 현재는 좌표별 가격 표시 기능 없음.

### 결정
**투명 히트박스 + 보간 툴팁** 패턴 채택:

1. **히트박스 레이어**: 추세선 각 `<line>` 위에 동일 좌표의 `<line>`을 하나 더 렌더:
   ```jsx
   <line ... stroke="transparent" strokeWidth={14} style={{cursor:"pointer"}}
     onMouseMove={handleLineHover}
     onMouseLeave={() => setHoverTooltip(null)}
     onTouchStart={handleLineTouch}
     onTouchMove={handleLineTouch}
   />
   ```
2. **가격 보간**:
   - 추세선 2점 `(t1, p1)`, `(t2, p2)`.
   - 포인터 x(픽셀) → `timeScale().coordinateToTime(x)` → `t_cursor`. (또는 더 단순하게 `candleSeries.coordinateToPrice(y)` 역변환 대신 x 기준 선형 보간)
   - 선형 보간: `price = p1 + (p2 - p1) * (t_cursor - t1) / (t2 - t1)`.
   - 또는 픽셀 기반: SVG 로컬 좌표를 사용해 `priceAtX = p1Pixel + (p2Pixel - p1Pixel) * (xCursor - x1) / (x2 - x1)` → `candleSeries.coordinateToPrice(priceAtX)` 로 달러 환산.
3. **툴팁 렌더**: 기존 `useState` 로 `hoverTooltip = { x, y, price, label }` 관리. 작은 `<div className="absolute pointer-events-none px-2 py-1 rounded bg-slate-900/95 border border-purple-500/40 text-xs text-purple-200">$123.45</div>`를 차트 컨테이너 기준 `left: x+8, top: y-28`에 배치.
4. **수평선**: `createPriceLine`의 `axisLabelVisible: true`는 이미 축 라벨을 보여주지만, 호버 일관성을 위해 수평선도 같은 히트박스 오버레이를 렌더하여 툴팁으로 가격 표시.
5. **드로잉 모드 OFF**: 히트박스 `<line>`은 항상 렌더되지만 `pointer-events: auto`는 기존 봉 크로스헤어와 충돌하지 않도록 `stroke="transparent"` + 얇은 히트박스 폭(14px)으로 제한. 봉 크로스헤어는 chart canvas 위에서 발생하므로 SVG 오버레이의 투명 영역은 `pointer-events: none` 유지, 선 히트박스만 `pointer-events: stroke`로 설정 (SVG 고유 속성).

### 대안 검토
- chart 라이브러리의 `subscribeClick` 이벤트 훅에 선 감지 로직 삽입: 복잡도 증가 + 호버 타이밍 제어 어려움 → 기각.
- 추세선을 `createPriceLine` 여러 개(수직선 보간)로 에뮬레이트: 차트 성능 저하, 어색한 점선 → 기각.

### 변경 파일
- `frontend/src/components/StockChart.tsx`

---

## 공통 비회귀 원칙

- 모든 변경은 **Tailwind 반응형 prefix**(`sm:` ≥ 640px) 사용. 데스크톱 기본값을 건드리지 않고 모바일 전용 분기만 추가 → 데스크톱 회귀 자동 방지.
- 기존 접근성 속성(`aria-label`, `role`, `tabIndex`) 전부 유지.
- 기존 localStorage 스키마 변경 금지: 차트 드로잉 저장 포맷 동일.
