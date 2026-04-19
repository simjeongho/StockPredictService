# Data Model: UI 재편

**Feature**: 002-ui-redesign  
**Date**: 2026-04-19

---

## Backend Changes: None

이 기능은 순수 프론트엔드 UI 변경으로 새로운 백엔드 데이터 모델이 없습니다.
기존 API 응답 타입(`WatchlistItem`, `ScoreRankingItem`)을 그대로 활용합니다.

---

## Frontend Component Data Contracts

### DashboardCard Props

대시보드 관심 종목 카드 컴포넌트의 Props 계약:

```typescript
// src/components/DashboardCard.tsx
interface DashboardCardProps {
  // 관심 종목 기본 정보 (항상 존재)
  item: WatchlistItem;
  // AI 분석 점수 (분석 이력 있는 경우만)
  score?: ScoreRankingItem;
  // 카드 클릭 핸들러
  onClick: () => void;
}

// 카드가 렌더링하는 데이터
type DashboardCardData = {
  ticker: string;           // "AAPL", "005930"
  display_name: string;     // "Apple Inc.", "삼성전자"
  market: "us" | "kr";     // 시장 뱃지 표시용
  current_price: number;   // 현재가
  change_pct: number;      // 등락률 (%)
  // AI 점수 (score가 있을 때만)
  total_score?: number;         // 종합 점수 0-100
  short_score?: number;         // 단기 점수
  mid_score?: number;           // 중기 점수
  long_score?: number;          // 장기 점수
  score_label?: string;         // "강력 매수" | "매수 고려" | "중립" | "매도 고려" | "강력 매도"
  analyzed_at?: string;         // 마지막 분석 시각
};
```

### GradientButton Props

```typescript
// src/components/GradientButton.tsx
interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}
```

### SkeletonCard (로딩 상태)

```typescript
// 별도 컴포넌트 없이 인라인으로 처리
// animate-pulse bg-white/5 rounded-2xl 패턴 사용
```

---

## Design Token Reference

Tailwind 클래스 기반 디자인 토큰 (코드 일관성용):

```typescript
// 프로젝트 전체에서 통일되어야 하는 패턴들

// 페이지 컨테이너
const PAGE = "min-h-screen bg-slate-950 text-slate-50";

// 글래스 카드
const GLASS_CARD = "bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl";
const GLASS_CARD_HOVER = "hover:bg-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300";

// Primary 그라디언트 텍스트
const GRADIENT_TEXT = "bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent";

// Primary 그라디언트 버튼
const GRADIENT_BTN = "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-300";

// 점수 색상 (기존 getScoreColor 함수와 연계)
const SCORE_UP = "text-emerald-400";
const SCORE_DOWN = "text-rose-400";
const SCORE_NEUTRAL = "text-slate-400";

// 섹션 헤더
const SECTION_HEADER = "text-2xl font-bold text-slate-50";
const SECTION_SUB = "text-sm text-slate-400 mt-1";
```

---

## Existing Types Used (No Changes)

아래 타입들은 `src/types/index.ts`에 이미 존재하며 변경하지 않습니다:

```typescript
WatchlistItem {
  id: string;
  ticker: string;
  market: "us" | "kr";
  display_name: string;
  current_price: number;
  change_pct: number;
  volume: number;
  added_at: string;
}

ScoreRankingItem {
  ticker: string;
  display_name: string;
  market: "us" | "kr";
  current_price: number;
  change_pct: number;
  buy_score: BuyScore;        // { short_term, mid_term, long_term }
  total_score: number;        // 0-100
  analyzed_at: string;
  in_watchlist: boolean;
  score_rationale: string | null;
}

BuyScore {
  short_term: BuyScoreTerm;  // { period, score, label }
  mid_term: BuyScoreTerm;
  long_term: BuyScoreTerm;
}
```
