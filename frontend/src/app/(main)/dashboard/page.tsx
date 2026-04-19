"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardCard from "@/components/DashboardCard";
import { getWatchlist, getScoreRanking } from "@/services/api";
import type { WatchlistItem, ScoreRankingItem } from "@/types";
import Link from "next/link";

function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-5 w-16 bg-white/10 rounded" />
        <div className="h-4 w-8 bg-white/10 rounded-full" />
      </div>
      <div className="h-3 w-32 bg-white/5 rounded mb-4" />
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="h-7 w-24 bg-white/10 rounded mb-1" />
          <div className="h-3 w-14 bg-white/5 rounded" />
        </div>
        <div className="h-10 w-12 bg-white/10 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center">
            <div className="h-2 w-6 bg-white/5 rounded mx-auto mb-1" />
            <div className="h-4 w-8 bg-white/10 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, ScoreRankingItem>>({});
  const [loading, setLoading] = useState(true);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    Promise.allSettled([
      getWatchlist(token),
      getScoreRanking(token, true, "total"),
    ]).then(([watchlistRes, scoresRes]) => {
      if (watchlistRes.status === "fulfilled") {
        setWatchlist(watchlistRes.value.items);
      }
      if (scoresRes.status === "fulfilled") {
        const map: Record<string, ScoreRankingItem> = {};
        for (const item of scoresRes.value.items) {
          map[item.ticker] = item;
        }
        setScoreMap(map);
      }
      setLoading(false);
    });
  }, [token]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="space-y-6">
        {/* 헤더 스켈레톤 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        {/* 카드 그리드 스켈레톤 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">
            내 관심 종목
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {watchlist.length > 0
              ? `총 ${watchlist.length}개 종목`
              : "관심 종목을 추가하고 AI 분석을 시작하세요"}
          </p>
        </div>
        <Link
          href="/watchlist"
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          목록 관리 →
        </Link>
      </div>

      {/* 카드 그리드 */}
      {watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <span className="text-4xl">📊</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">
            관심 종목이 없습니다
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            종목을 검색하고 관심 목록에 추가해보세요.
          </p>
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 shadow-lg shadow-purple-500/25 hover:scale-[1.02] transition-all duration-300"
          >
            종목 검색하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => (
            <DashboardCard
              key={`${item.ticker}-${item.market}`}
              item={item}
              score={scoreMap[item.ticker]}
              onClick={() =>
                router.push(`/stock/${item.ticker}?market=${item.market}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
