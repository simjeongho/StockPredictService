"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { searchStocks, getMarketSummary } from "@/services/api";
import type { StockSearchResult, MarketSummary } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [summary, setSummary] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 시장 요약 로드
  useState(() => {
    getMarketSummary()
      .then(setSummary)
      .catch(() => {});
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const data = await searchStocks(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 시장 요약 카드 */}
      {summary.map((market) => (
        <div key={market.market} className="grid grid-cols-3 gap-3">
          {market.indices.map((idx) => (
            <div
              key={idx.name}
              className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
            >
              <p className="text-xs text-gray-500">{idx.name}</p>
              <p className="text-lg font-semibold">
                {idx.value.toLocaleString()}
              </p>
              <p
                className={`text-sm ${
                  idx.change_pct >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {idx.change_pct >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(idx.change_pct).toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      ))}

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목명 또는 티커 입력 (예: AAPL, 삼성전자)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "검색 중..." : "검색"}
        </button>
      </form>

      {/* 검색 결과 */}
      {searched && (
        <div>
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              해당 종목을 찾을 수 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((stock) => (
                <button
                  key={`${stock.ticker}-${stock.market}`}
                  onClick={() =>
                    router.push(
                      `/stock/${stock.ticker}?market=${stock.market}`
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-left"
                >
                  <div>
                    <span className="font-semibold">{stock.ticker}</span>
                    <span className="text-gray-500 ml-2 text-sm">
                      {stock.name}
                    </span>
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {stock.exchange}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {stock.currency === "KRW"
                        ? `${stock.current_price.toLocaleString()}원`
                        : `$${stock.current_price.toFixed(2)}`}
                    </p>
                    <p
                      className={`text-sm ${
                        stock.change_pct >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stock.change_pct >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(stock.change_pct).toFixed(2)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
