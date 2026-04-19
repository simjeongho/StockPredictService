"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import WatchlistCard from "@/components/WatchlistCard";
import GradientButton from "@/components/GradientButton";
import { getWatchlist, removeWatchlist, deleteMe, searchStocks, addWatchlist } from "@/services/api";
import type { WatchlistItem, StockSearchResult } from "@/types";

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 검색 + 추가 상태
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState<"us" | "kr">("us");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    if (session && token) {
      setLoading(true);
      getWatchlist(token)
        .then((res) => setItems(res.items))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, token]);

  // 검색창 외부 클릭 시 결과 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 디바운스 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchStocks(query.trim(), market);
        setResults(data.slice(0, 10));
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, market]);

  const handleAdd = async (result: StockSearchResult) => {
    if (!token) return;
    setAdding(result.ticker);
    try {
      const added = await addWatchlist(token, result.ticker, result.market, result.name);
      setItems((prev) => [...prev, added]);
      setQuery("");
      setResults([]);
      setShowResults(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        alert("이미 관심 종목에 추가된 종목입니다.");
      } else if (status === 400) {
        alert("관심 종목은 최대 30개까지 추가할 수 있습니다.");
      } else {
        alert("추가에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (ticker: string) => {
    try {
      await removeWatchlist(token, ticker);
      setItems((prev) => prev.filter((i) => i.ticker !== ticker));
    } catch {
      alert("삭제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMe(token);
      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/login" });
    } catch {
      alert("회원 탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const isAlreadyAdded = (ticker: string) =>
    items.some((i) => i.ticker === ticker);

  if (status === "loading") {
    return (
      <div className="text-center py-12 text-slate-400">로딩 중...</div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <p className="text-slate-300 mb-2 font-medium">로그인이 필요합니다</p>
        <p className="text-slate-500 text-sm mb-8">관심 종목 기능을 사용하려면 로그인해 주세요.</p>
        <div className="flex justify-center gap-3">
          <GradientButton onClick={() => signIn("google")} size="md">
            Google로 로그인
          </GradientButton>
          <button
            onClick={() => signIn("kakao")}
            className="px-6 py-3 bg-[#FEE500] hover:bg-[#FFD700] text-slate-900 font-semibold rounded-xl hover:scale-[1.02] transition-all duration-300"
          >
            카카오로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">관심 종목</h1>
        <span className="text-sm text-slate-500">{items.length} / 30개</span>
      </div>

      {/* 종목 검색 + 추가 패널 */}
      <div ref={searchRef} className="relative">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium">종목 추가</p>
          <div className="flex gap-2">
            {/* 검색창 */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {searching ? (
                  <svg className="w-4 h-4 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="종목명 또는 티커 검색 (예: AAPL, 삼성전자)"
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-slate-50 placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/60 focus:bg-white/15 transition-all"
              />
            </div>
            {/* 마켓 필터 */}
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as "us" | "kr")}
              className="px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-purple-500/60 transition-all cursor-pointer"
            >
              <option value="us" className="bg-slate-900">🇺🇸 US</option>
              <option value="kr" className="bg-slate-900">🇰🇷 KR</option>
            </select>
          </div>
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            {results.map((result) => {
              const added = isAlreadyAdded(result.ticker);
              const isAdding = adding === result.ticker;
              return (
                <div
                  key={`${result.ticker}-${result.market}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-50">{result.ticker}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400">
                          {result.market.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{result.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {result.current_price > 0 && (
                      <span className="text-xs text-slate-500 hidden sm:block">
                        {result.market === "us"
                          ? `$${result.current_price.toLocaleString()}`
                          : `₩${result.current_price.toLocaleString()}`}
                      </span>
                    )}
                    {added ? (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium">
                        추가됨
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(result)}
                        disabled={isAdding}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium disabled:opacity-50 transition-all"
                      >
                        {isAdding ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        추가
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 검색어 있지만 결과 없음 */}
        {showResults && query.trim() && !searching && results.length === 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 px-4 py-6 text-center">
            <p className="text-slate-400 text-sm">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 관심 종목 목록 */}
      {loading ? (
        <p className="text-center text-slate-500 py-8">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-slate-400 mb-1">등록된 관심 종목이 없습니다.</p>
          <p className="text-slate-600 text-sm">위 검색창에서 종목을 찾아 추가해보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <WatchlistCard
              key={`${item.ticker}-${item.market}`}
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* 회원 탈퇴 (FR-020) */}
      <div className="pt-8 border-t border-white/5">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm text-slate-600 hover:text-rose-400 underline transition-colors"
        >
          회원 탈퇴
        </button>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-50 mb-2">회원 탈퇴</h2>
            <p className="text-sm text-slate-400 mb-6">
              탈퇴하면 관심 종목이 모두 삭제됩니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-white/20 text-slate-300 rounded-xl text-sm hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-500 disabled:opacity-50 transition-colors"
              >
                {deleting ? "처리 중..." : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
