# Quickstart: 003-ui-redesign 검증 가이드

**Feature**: 003-ui-redesign
**Date**: 2026-04-22

---

## 전제 조건

- Node.js 18+, npm 설치됨
- `frontend/.env.local` 설정 완료 (002-ui-redesign 환경 그대로)
- 백엔드 서버 실행 중 (`uvicorn app.main:app --reload --port 8000`)
- 002-ui-redesign 변경사항 머지 완료

---

## 개발 환경 시작

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## 변경 파일 목록

### 수정 파일 (7개)

| 파일 | 변경 내용 | 관련 US |
|------|----------|---------|
| `frontend/src/components/NavClient.tsx` | 드로어 배경 `bg-slate-950/95 backdrop-blur-md` → `bg-slate-950` + 상단 브랜드 그라디언트 엣지 | US-1 |
| `frontend/src/app/(main)/history/page.tsx` | `TypeBadge`, `ScoreBadge` `whitespace-nowrap` 추가 | US-3 |
| `frontend/src/components/ScoreTable.tsx` | SORT_TABS에 `shortLabel` 추가, 토글 컨테이너 모바일 `grid grid-cols-4`로 변경 | US-4 |
| `frontend/src/components/ScoreGauge.tsx` | `flex justify-around` → `grid grid-cols-3 place-items-center`, ArcGauge 크기 반응형 | US-2 |
| `frontend/src/app/(main)/stock/[ticker]/page.tsx` | ScoreGauge 래퍼 폭 점검 (모바일 `w-full`) | US-2 |
| `frontend/src/components/StockChart.tsx` | 추세선·수평선 위에 투명 히트박스 overlay + 보간 가격 툴팁 | US-5 |

### 신규 파일 (0개)

없음.

---

## 구현 순서 (권장)

### Step 1: 가장 단순한 수정부터
1. `NavClient.tsx` — 드로어 배경 클래스 교체 (US-1)
2. `history/page.tsx` — 뱃지 `whitespace-nowrap` 2곳 (US-3)

### Step 2: 레이아웃 반응형
3. `ScoreTable.tsx` — 토글 그리드 + 축약 라벨 (US-4)
4. `ScoreGauge.tsx` — 그리드 + 모바일 게이지 크기 (US-2)
5. `stock/[ticker]/page.tsx` — ScoreGauge 감싸는 섹션 폭 확인 (US-2 마무리)

### Step 3: 가장 복잡한 인터랙션
6. `StockChart.tsx` — SVG 히트박스 + 가격 보간 툴팁 (US-5)

---

## 테스트 체크리스트

### US-1 햄버거 드로어 배경 (모바일)
- [ ] Chrome DevTools iPhone SE(375px) 또는 Galaxy S25 Edge에서 `/dashboard` 접속
- [ ] 햄버거 탭 → 드로어 펼쳐짐
- [ ] 드로어 뒤 대시보드 카드 콘텐츠가 **전혀 보이지 않음** (완전 불투명)
- [ ] 메뉴 링크("종목 검색", "관심 종목", "분석 기록" 등) 글자가 명확히 읽힘
- [ ] 드로어 상단에 보라색 은은한 그라디언트 엣지가 보임(브랜드 톤)
- [ ] 드로어 열린 상태에서 배경 스크롤 잠금 유지
- [ ] 링크 탭 시 페이지 이동 + 드로어 자동 닫힘

### US-2 AI 점수 게이지 중앙 정렬
- [ ] 모바일 375px 뷰포트에서 AAPL 또는 RKLB 분석 완료 화면
- [ ] 단기/중기/장기 3개 게이지가 한 줄에 가로 스크롤 없이 표시
- [ ] 3개 게이지가 화면 수평 **중앙 대칭** 배치 (좌우 여백 차이 ≤ 8px)
- [ ] 각 게이지 라벨("단기 (1주)", "중기 (3개월)", "장기 (1년)") 줄바꿈 없음
- [ ] 데스크톱 1280px에서 기존 게이지 크기(112px) 및 구분선 유지

### US-3 /history 뱃지 한 줄
- [ ] `/history`에 여러 기록 있는 상태로 모바일 375px 진입
- [ ] "비교"/"종목"/"중립"/"매수고려"/"매수"/"매도" 뱃지 모두 한 줄 유지
- [ ] 뱃지 폭이 셀을 넘으면 테이블 가로 스크롤로 해결 (줄바꿈 X)
- [ ] 데스크톱에서 기존 렌더 동일

### US-4 /scores 토글 모바일 한 화면
- [ ] Galaxy S25 Edge 또는 360px 뷰포트에서 `/scores` 진입
- [ ] 4개 토글(단기/중기/장기/종합)이 가로 스크롤 **없이** 한 행에 모두 보임
- [ ] 각 토글 탭 영역 세로 ≥ 36px (터치 불편함 없음)
- [ ] 탭 시 정렬 결과 반영 및 활성 토글 시각 표시
- [ ] 데스크톱 ≥ 640px에서 기존 풀 라벨("단기 (1주)" 등)과 flex 레이아웃 복원

### US-5 차트 그린 선 가격 툴팁
- [ ] 종목 상세 페이지에서 차트 위 "추세선" 모드로 추세선 1개 생성
- [ ] 데스크톱 마우스로 추세선 위를 호버 → 커서 근처에 `$123.45` 형태 툴팁 노출
- [ ] 모바일 터치로 추세선 위를 탭 → 동일한 툴팁 노출
- [ ] 툴팁 x좌표가 달라지면 가격이 선형 보간되어 변함
- [ ] 수평선 위에서도 호버/터치 시 해당 고정 가격 툴팁 표시
- [ ] 드로잉 모드 OFF → 기존 봉 크로스헤어·툴팁 회귀 없이 동작
- [ ] 툴팁은 다른 곳 호버/탭 시 사라짐

### 데스크톱 회귀 (≥ 1280px)
- [ ] NAV 레이아웃 변화 없음 (햄버거 숨김)
- [ ] `/history` 테이블 기존 스타일 유지
- [ ] `/scores` 토글 풀 라벨 + flex 레이아웃 유지
- [ ] `/stock/[ticker]` ArcGauge 112px + 세로 구분선 유지
- [ ] 차트 드로잉 기능 / 크로스헤어 기존 동일

### Galaxy S25 Edge 실기기 최종 확인
- [ ] 위 5개 User Story 체크리스트 전부 실기기에서 통과
- [ ] 세로 모드 / 가로 모드 전환 시 드로어·게이지·토글 레이아웃 유지
- [ ] 터치 인터랙션(드로어 링크, 토글 선택, 차트 선 가격 보기) 전부 응답 시간 100ms 이내

---

## Constitution 비회귀 체크리스트

- [ ] Disclaimer 컴포넌트가 AI 분석 결과 화면에 계속 노출됨 (§II)
- [ ] 투명성 경고 문구 변경 없음 (§III)
- [ ] 백엔드 API 호출 로직 / 토큰 로직 변경 없음 (§V)
- [ ] 접근성: 모든 인터랙티브 요소 키보드 포커스 가능, 대비 비율 WCAG AA 이상 (§VI)
