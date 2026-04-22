# Implementation Plan: 모바일 UI 세부 개선 (003-ui-redesign)

**Branch**: `003-ui-redesign` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-ui-redesign/spec.md`

## Summary

002-ui-redesign의 모바일 반응형·차트 드로잉·AI 점수 배지·/history 행 클릭 구현을 실제 Galaxy S25 Edge에서 사용하며 발견된 5개의 UI 결함을 프론트엔드 전용 패치로 해결한다: (1) 햄버거 드로어 불투명 배경, (2) AI 점수 게이지 모바일 중앙 정렬, (3) /history 뱃지 한 줄 고정, (4) /scores 토글 4개 모바일 한 행 배치, (5) 차트 그린 선 hover/터치 시 가격 툴팁. 백엔드·DB 스키마·API 계약 변경 없음, Tailwind 유틸리티 기반 CSS만 수정.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 14 App Router)
**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS 3, NextAuth.js v5, Axios, lightweight-charts v4.2.0
**Storage**: N/A (프론트엔드 전용; 기존 localStorage `chart_drawings_{ticker}_{market}` 키는 읽기 전용으로 재사용)
**Testing**: 수동 시각 검증 (Chrome DevTools 360/375/412/640/1280/1920px 뷰포트 + 실제 Galaxy S25 Edge)
**Target Platform**: 웹 브라우저 (Chrome/Edge/Safari 최신, 모바일 Safari/Chrome)
**Project Type**: Web application — frontend만 수정
**Performance Goals**: 드로어 열기/닫기 16ms 이내 (60fps), 차트 선 호버 툴팁 100ms 이내 표시
**Constraints**:
  - 모바일 360–412px 뷰포트에서 가로 스크롤 없음(테이블 래퍼 내부 제외)
  - 터치 타겟 세로 ≥ 36px (`/scores` 토글)
  - 데스크톱 ≥ 640px 회귀 없음
  - 백엔드 API 변경 금지
**Scale/Scope**: 4개 컴포넌트 + 1개 페이지 (총 5파일) 수정. 신규 파일 없음.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 조항 | 영향 | 판정 |
|------|------|------|
| §I 스펙 우선 | 002 피처의 UX 결함을 spec에 정의하고 FR/SC 기준으로 구현 | ✅ PASS |
| §II Disclaimer | AI 분석 결과 화면(`/stock/[ticker]`)의 Disclaimer 컴포넌트를 보존(이동만, 제거·숨김 금지) | ✅ PASS — ScoreGauge 레이아웃 변경 시 Disclaimer 유지 |
| §III 투명성 / 비결정성 경고 | 기존 경고 문구 변경 없음 | ✅ PASS |
| §IV 데이터·프라이버시 | 백엔드/DB/계정 삭제 플로우 무관 | ✅ PASS |
| §V 비용 관리 | Claude API 호출 로직·토큰 룰 변경 없음 | ✅ PASS |
| §VI 접근성 | `/scores` 토글 최소 폰트 12px 유지, 터치 타겟 ≥ 36px, 드로어 배경 대비 강화 → 가독성 개선 | ✅ PASS |

**재검증 (Phase 1 이후)**: Complexity Tracking 공란. 신규 패턴·라이브러리 도입 없음.

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-redesign/
├── plan.md              # 이 파일
├── spec.md              # 5개 User Story
├── research.md          # Phase 0: 5개 이슈 기술 결정
├── quickstart.md        # Phase 1: 검증 체크리스트
└── tasks.md             # Phase 2 (/speckit.tasks 출력)
```

data-model.md, contracts/ 는 생성하지 않는다 (백엔드 변경 없음, 신규 엔티티 없음).

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   └── (main)/
│   │       ├── history/page.tsx        # US-3: 뱃지 whitespace-nowrap
│   │       ├── scores/page.tsx         # US-4: 토글 축약 라벨 + grid
│   │       └── stock/[ticker]/page.tsx # US-2: ScoreGauge 섹션 중앙 정렬 래퍼 조정
│   └── components/
│       ├── NavClient.tsx               # US-1: 드로어 배경 bg-slate-950 불투명 + 브랜드 엣지
│       ├── ScoreGauge.tsx              # US-2: 모바일 그리드 / 게이지 크기 반응형
│       ├── ScoreTable.tsx              # US-4: 토글 라벨·그리드 모바일 반응형
│       └── StockChart.tsx              # US-5: 그린 선 hover/터치 가격 툴팁
```

수정 파일 7개. 신규 파일 0개.

**Structure Decision**: 002-ui-redesign이 도입한 `(main)` 라우트 그룹 구조를 그대로 사용한다. 컴포넌트 계층 변경 없음; 기존 파일 안에서 Tailwind 클래스 교체 및 렌더링 분기만 추가한다.

## Phase 0 — 연구·결정 요약

자세한 내용은 [research.md](./research.md). 핵심 결정만 요약:

1. **드로어 배경**: Tailwind `bg-slate-950` (완전 불투명) + 상단 내부 `before:` 의사 엘리먼트로 `from-purple-500/10 to-transparent` 그라디언트 엣지. `backdrop-blur`는 의미가 사라지므로 제거.
2. **뱃지 줄바꿈 방지**: `TypeBadge`·`ScoreBadge` 컨테이너에 `whitespace-nowrap inline-flex items-center` 추가. 테이블 래퍼의 `overflow-x-auto`가 초과 폭을 흡수.
3. **/scores 토글**: 데스크톱은 기존 flex 유지, 모바일(`sm:hidden`)에는 `grid grid-cols-4 gap-1.5` + 축약 라벨(`단기/중기/장기/종합`) 사용. `px-2 py-2 text-xs` 로 터치 타겟 36px 보장.
4. **ScoreGauge 중앙 정렬**: 기존 `flex justify-around` → 모바일 `grid grid-cols-3 place-items-center`로 변경, ArcGauge 크기 모바일 `w-24 h-24` / 데스크톱 `w-28 h-28` 분기. 라벨 모바일 `text-[11px]`, 데스크톱 `text-sm`.
5. **차트 선 호버 툴팁**: SVG 추세선은 불투명 얇은 선(`stroke-width:2`) 위에 투명 두꺼운 히트박스(`stroke-width:14 stroke-transparent`) 레이어 추가. `onMouseMove`/`onTouchMove`로 포인터의 x→time→보간된 price 계산 후 React state로 `{line_id, x, y, price}` 관리하여 절대 포지셔닝된 작은 툴팁 렌더. 수평선은 priceLines가 가진 고정 가격을 그대로 표시.

## Phase 1 — 설계 산출물

- **data-model.md**: 생성 안 함 (신규 엔티티 없음, localStorage 구조 동일).
- **contracts/**: 생성 안 함 (신규 API 없음).
- **quickstart.md**: 시각 검증 체크리스트 생성. 각 User Story별 모바일/데스크톱 테스트 시나리오 포함.
- **CLAUDE.md**: 변경 없음 (신규 기술 스택 없음; update-agent-context 실행 생략).

## 구현 순서 (권장)

1. **US-1 햄버거 드로어** (10분) — `NavClient.tsx` 배경 클래스 교체, 가장 빠른 시각적 개선.
2. **US-3 /history 뱃지** (5분) — `whitespace-nowrap` 2곳 추가. 회귀 영향 최소.
3. **US-4 /scores 토글** (20분) — `ScoreTable.tsx` SORT_TABS 렌더링 분기. 모바일 그리드 + 축약 라벨.
4. **US-2 ScoreGauge 중앙 정렬** (25분) — `ScoreGauge.tsx` flex→grid 모바일 분기 + 크기 반응형.
5. **US-5 차트 선 hover/터치** (60분) — 가장 복잡. SVG 히트박스 + 보간 로직 + 툴팁 렌더.

총 예상 소요: ~2시간 (수정 파일 7개, 순수 프론트엔드 작업).

## Complexity Tracking

신규 라이브러리·패턴 도입 없음. 기존 Tailwind + lightweight-charts 조합 안에서 해결. Complexity Tracking 항목 없음.
