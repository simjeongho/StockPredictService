// 종목 검색 결과
export interface StockSearchResult {
  ticker: string;
  name: string;
  market: "us" | "kr";
  exchange: string;
  current_price: number;
  change_pct: number;
  volume: number;
  market_cap: number;
  currency: string;
}

// 캔들 데이터 (OHLCV)
export interface Candle {
  time: string; // ISO 8601 날짜
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 주가 조회 응답
export interface PriceResponse {
  ticker: string;
  market: "us" | "kr";
  period: string;
  candles: Candle[];
  market_status: "open" | "closed" | "holiday";
  last_updated: string;
}

// 기술 지표
export interface IndicatorsData {
  ticker: string;
  market: "us" | "kr";
  as_of: string;
  price: {
    current: number;
    change_pct: number;
    volume: number;
    market_cap: number;
  };
  sma: { sma5: number; sma20: number; sma50: number; sma200: number };
  rsi: { rsi14: number };
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number };
  stochastic: { k: number; d: number };
}

// 시장 요약
export interface MarketSummary {
  market: string;
  indices: Array<{
    name: string;
    value: number;
    change_pct: number;
  }>;
  as_of: string;
}

// 예측 점수 (단일 시간축)
export interface BuyScoreTerm {
  period: string;
  score: number;
  label: string;
}

// 예측 점수 전체
export interface BuyScore {
  short_term: BuyScoreTerm;
  mid_term: BuyScoreTerm;
  long_term: BuyScoreTerm;
}

// SSE 스트리밍 이벤트
export interface AnalysisEvent {
  type: "text" | "score" | "disclaimer" | "cached" | "out_of_scope" | "done" | "saved" | "save_error";
  text?: string;
  score?: BuyScore;
  disclaimer?: string;
  cached_at?: string;
}

// 관심 종목 아이템
export interface WatchlistItem {
  id: string;
  ticker: string;
  market: "us" | "kr";
  display_name: string;
  current_price: number;
  change_pct: number;
  volume: number;
  added_at: string;
}

// 관심 종목 목록 응답
export interface WatchlistResponse {
  items: WatchlistItem[];
  total: number;
  limit: number;
}

// 챗봇 메시지
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// 점수 랭킹 아이템
export interface ScoreRankingItem {
  ticker: string;
  display_name: string;
  market: "us" | "kr";
  current_price: number;
  change_pct: number;
  buy_score: BuyScore;
  total_score: number;
  analyzed_at: string;
  in_watchlist: boolean;
  score_rationale: string | null;
}

// 점수 랭킹 응답
export interface ScoreRankingResponse {
  market: string;
  sort_by: string;
  as_of: string;
  items: ScoreRankingItem[];
  total: number;
  disclaimer: string;
}

// 사용자 프로필
export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  provider: "google" | "kakao";
  created_at: string;
  watchlist_count: number;
}

// API 오류 응답
export interface ApiError {
  error: string;
  message: string;
}

// 분석 기록 아이템
export interface HistoryItem {
  id: number;
  ticker: string;
  market: "us" | "kr";
  buy_score_short: number | null;
  buy_score_short_label: string | null;
  buy_score_mid: number | null;
  buy_score_mid_label: string | null;
  buy_score_long: number | null;
  buy_score_long_label: string | null;
  analysis_type: "stock" | "comparison";
  tickers_json: string | null;
  created_at: string;
}

// 분석 기록 상세
export interface HistoryDetail extends HistoryItem {
  analysis_text: string;
}

// 비교 분석 이벤트
export interface ComparisonEvent {
  type: "text" | "error" | "disclaimer" | "done" | "saved" | "save_error";
  text?: string;
  disclaimer?: string;
}

// 시장 이슈 사용량
export interface MarketUsage {
  used: number;
  limit: number;
}

// 점수 라벨 색상 매핑
export const SCORE_COLORS: Record<string, string> = {
  "강력 매도": "#EF4444",
  "매도 고려": "#F97316",
  중립: "#EAB308",
  "매수 고려": "#84CC16",
  "강력 매수": "#22C55E",
};

export function getScoreLabel(score: number): string {
  if (score <= 20) return "강력 매도";
  if (score <= 40) return "매도 고려";
  if (score <= 60) return "중립";
  if (score <= 80) return "매수 고려";
  return "강력 매수";
}

export function getScoreColor(score: number): string {
  return SCORE_COLORS[getScoreLabel(score)] ?? "#EAB308";
}
