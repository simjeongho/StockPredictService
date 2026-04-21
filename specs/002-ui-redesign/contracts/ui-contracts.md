# UI Contracts: 002-ui-redesign

**Feature**: 002-ui-redesign  
**Date**: 2026-04-19  
**Type**: Frontend UI component & page contracts

---

## Page Contracts

### `/login` — 로그인 페이지

| 항목 | 명세 |
|------|------|
| Route | `/login` |
| Auth required | No (미인증 전용) |
| Redirect if authed | `/dashboard` |
| Layout | Fullscreen (layout.tsx nav 제외) |

**렌더링 구성**:
```
[배경: 보라→파랑 그라디언트 + 미세 패턴]
  [중앙 글래스 카드]
    [로고 + 서비스명]
    [서비스 소개 문구 (1-2줄)]
    [Google 로그인 버튼]
    [Kakao 로그인 버튼]
    [면책 고지 (소문자)]
```

**상태**:
- 기본: 로그인 버튼 활성
- 로딩: 버튼 비활성화 + 스피너

---

### `/dashboard` — 관심 종목 대시보드

| 항목 | 명세 |
|------|------|
| Route | `/dashboard` |
| Auth required | Yes (비인증 → `/login`) |
| Layout | 공통 layout.tsx 사용 |

**렌더링 구성**:
```
[헤더: "내 관심 종목" + 종목 수 뱃지]
[검색 바: 종목 검색 바로가기 링크]
[카드 그리드: 2열(모바일) / 3열(데스크톱)]
  [DashboardCard × N]
[빈 상태: 안내 문구 + 종목 검색 링크]
```

**상태**:
- 로딩: 스켈레톤 카드 6개
- 데이터 있음: 관심 종목 카드 그리드
- 빈 상태: 빈 상태 일러스트 + CTA

---

### `/` — 루트 리다이렉터

| 항목 | 명세 |
|------|------|
| Route | `/` |
| Auth required | N/A (리다이렉트만) |

**동작**:
- 비로그인: `redirect('/login')`
- 로그인: `redirect('/dashboard')`

---

## Component Contracts

### `DashboardCard`

```
Props:
  item: WatchlistItem       — 필수, 종목 기본 정보
  score?: ScoreRankingItem  — 선택, AI 분석 점수
  onClick: () => void       — 필수, 클릭 핸들러

Renders:
  [상단]
    [Ticker 텍스트] [Market 뱃지: US/KR]
    [Display Name (보조 텍스트)]
  [중간]
    [현재가 (큰 폰트)]
    [등락률 (상승=emerald, 하락=rose)]
  [하단] (score 있을 때)
    [총점 게이지 or 숫자: N/100]
    [단기 | 중기 | 장기 점수]
  [하단] (score 없을 때)
    ["AI 분석 필요" 안내 + 링크]

States:
  - 기본: 글래스 카드 스타일
  - 호버: scale-up + 보라 테두리 + 그림자
  - 로딩: animate-pulse 스켈레톤 (별도 처리)
```

### `GradientButton`

```
Props:
  children: ReactNode     — 버튼 텍스트/아이콘
  onClick?: () => void    — 클릭 핸들러
  disabled?: boolean      — 비활성화
  variant?: "primary" | "outline"  — 기본 primary
  size?: "sm" | "md" | "lg"        — 기본 md

Renders:
  primary: 보라→파랑 그라디언트 배경, 흰 텍스트
  outline: 투명 배경, 보라→파랑 그라디언트 테두리, 그라디언트 텍스트
```

### `layout.tsx` Nav Bar

```
Renders:
  [로고: "StockAI" 그라디언트 텍스트]
  [네비 링크: 대시보드 | 관심종목 | 점수비교 | AI챗봇]
  [우측: 로그인 상태에 따라]
    비로그인: "로그인" 버튼
    로그인:   [사용자 이름] [로그아웃 버튼]

Style:
  배경: bg-slate-950/80 backdrop-blur-md
  테두리: border-b border-white/5
  로고: bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent
  활성 링크: text-white (비활성: text-slate-400 hover:text-slate-200)
```

---

## Design System Summary

### 배경 계층

| 계층 | 클래스 | 용도 |
|------|--------|------|
| L0 페이지 | `bg-slate-950` | HTML body 기본 |
| L1 섹션 | `bg-slate-900/50` | 구분 섹션 배경 |
| L2 카드 | `bg-white/5 backdrop-blur-md` | 글래스 카드 |
| L3 입력 | `bg-white/10` | 입력창, 선택박스 |

### 텍스트 계층

| 역할 | 클래스 |
|------|--------|
| 제목 | `text-slate-50 font-bold` |
| 본문 | `text-slate-200` |
| 보조 | `text-slate-400` |
| 비활성 | `text-slate-600` |
| 그라디언트 강조 | `bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent` |

### 상태 색상

| 상태 | 클래스 |
|------|--------|
| 상승/긍정 | `text-emerald-400` |
| 하락/부정 | `text-rose-400` |
| 경고 | `text-amber-400` |
| 중립 | `text-slate-400` |
| 강조 1 | `text-cyan-400` |
| 강조 2 | `text-violet-400` |
