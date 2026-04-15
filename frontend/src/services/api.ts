import axios from "axios";
import type {
  StockSearchResult,
  PriceResponse,
  IndicatorsData,
  MarketSummary,
  WatchlistItem,
  WatchlistResponse,
  ScoreRankingItem,
  ScoreRankingResponse,
  UserProfile,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 10000,
});

// 요청 인터셉터: Bearer 토큰 자동 주입
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── 종목 검색 & 주가 ───────────────────────────────────────

export async function searchStocks(
  q: string,
  market?: "us" | "kr"
): Promise<StockSearchResult[]> {
  const { data } = await api.get("/api/v1/stocks/search", {
    params: { q, market },
  });
  return data;
}

export async function getPrice(
  ticker: string,
  period: "1m" | "3m" | "6m" | "1y" = "1m"
): Promise<PriceResponse> {
  const { data } = await api.get(`/api/v1/stocks/${ticker}/price`, {
    params: { period },
  });
  return data;
}

export async function getIndicators(ticker: string): Promise<IndicatorsData> {
  const { data } = await api.get(`/api/v1/stocks/${ticker}/indicators`);
  return data;
}

export async function getMarketSummary(): Promise<MarketSummary[]> {
  const { data } = await api.get("/api/v1/stocks/market/summary");
  return data;
}

// ─── 관심 종목 ───────────────────────────────────────────────

export async function getWatchlist(token: string): Promise<WatchlistResponse> {
  const { data } = await api.get("/api/v1/watchlist", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function addWatchlist(
  token: string,
  ticker: string,
  market: "us" | "kr",
  display_name: string
): Promise<WatchlistItem> {
  const { data } = await api.post(
    "/api/v1/watchlist",
    { ticker, market, display_name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function removeWatchlist(
  token: string,
  ticker: string
): Promise<void> {
  await api.delete(`/api/v1/watchlist/${ticker}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── 예측 점수 ───────────────────────────────────────────────

export async function getScore(ticker: string): Promise<ScoreRankingItem> {
  const { data } = await api.get(`/api/v1/stocks/${ticker}/score`);
  return data;
}

export async function getScoreRanking(
  token: string,
  watchlistOnly = true,
  sortBy = "short"
): Promise<ScoreRankingResponse> {
  const { data } = await api.get("/api/v1/scores/ranking", {
    params: { watchlist_only: watchlistOnly, sort_by: sortBy },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ─── 인증 ────────────────────────────────────────────────────

export async function verifyAuth(
  token: string
): Promise<{ user_id: string; email: string; name: string; provider: string; is_new_user: boolean }> {
  const { data } = await api.post(
    "/api/v1/auth/verify",
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function getMe(token: string): Promise<UserProfile> {
  const { data } = await api.get("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function updateMe(
  token: string,
  name: string
): Promise<UserProfile> {
  const { data } = await api.put(
    "/api/v1/users/me",
    { name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function deleteMe(token: string): Promise<void> {
  await api.delete("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default api;
