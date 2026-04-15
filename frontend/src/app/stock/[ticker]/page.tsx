"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import StockChart from "@/components/StockChart";
import ScoreGauge from "@/components/ScoreGauge";
import Disclaimer from "@/components/Disclaimer";
import { getPrice, getIndicators, addWatchlist, removeWatchlist } from "@/services/api";
import type { PriceResponse, IndicatorsData, BuyScore, AnalysisEvent } from "@/types";

type Period = "1m" | "3m" | "6m" | "1y";

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const searchParams = useSearchParams();
  const market = (searchParams.get("market") as "us" | "kr") ?? "us";
  const { data: session } = useSession();

  const [period, setPeriod] = useState<Period>("1m");
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);
  const [indicators, setIndicators] = useState<IndicatorsData | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiText, setAiText] = useState("");
  const [buyScore, setBuyScore] = useState<BuyScore | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // 주가 데이터 로드
  const loadPrice = useCallback(async () => {
    setLoadingPrice(true);
    try {
      const [price, ind] = await Promise.all([
        getPrice(ticker, period),
        getIndicators(ticker),
      ]);
      setPriceData(price);
      setIndicators(ind);
    } catch {
      // 오류 처리
    } finally {
      setLoadingPrice(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    loadPrice();
  }, [loadPrice]);

  // AI 분석 요청 (SSE 스트리밍)
  const requestAnalysis = async () => {
    setLoadingAI(true);
    setAiText("");
    setBuyScore(null);

    const token = (session as { accessToken?: string })?.accessToken ?? "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/analyze`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ticker, market, period }),
        }
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const event: AnalysisEvent = JSON.parse(payload);
            if (event.type === "text" && event.text) {
              setAiText((prev) => prev + event.text);
            } else if (event.type === "score" && event.score) {
              setBuyScore(event.score);
            }
          } catch {
            // JSON 파싱 오류 무시
          }
        }
      }
    } catch {
      setAiText("AI 분석 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingAI(false);
    }
  };

  // 관심 종목 토글
  const toggleWatchlist = async () => {
    if (!session) {
      alert("관심 종목 기능을 사용하려면 로그인이 필요합니다.");
      return;
    }
    const token = (session as { accessToken?: string })?.accessToken ?? "";
    try {
      if (isInWatchlist) {
        await removeWatchlist(token, ticker);
        setIsInWatchlist(false);
      } else {
        await addWatchlist(token, ticker, market, ticker);
        setIsInWatchlist(true);
      }
    } catch {
      alert("관심 종목 변경에 실패했습니다.");
    }
  };

  const price = indicators?.price;
  const staleData = priceData?.market_status === "closed" || priceData?.market_status === "holiday";

  return (
    <div className="space-y-6">
      {/* 종목 헤더 */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{ticker.toUpperCase()}</h1>
            <p className="text-gray-500 text-sm">{market.toUpperCase()}</p>
            {price && (
              <div className="mt-2">
                <span className="text-3xl font-semibold">
                  {market === "kr"
                    ? `${price.current.toLocaleString()}원`
                    : `$${price.current.toFixed(2)}`}
                </span>
                <span
                  className={`ml-3 text-lg ${
                    price.change_pct >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {price.change_pct >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(price.change_pct).toFixed(2)}%
                </span>
              </div>
            )}
            {staleData && (
              <p className="text-xs text-orange-500 mt-1">
                ⚠️ 장 마감 데이터 · 마지막 업데이트: {priceData?.last_updated?.slice(0, 10)}
              </p>
            )}
          </div>
          <button
            onClick={toggleWatchlist}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isInWatchlist
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isInWatchlist ? "★ 관심 종목 해제" : "☆ 관심 종목 추가"}
          </button>
        </div>
      </div>

      {/* 차트 탭 */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex gap-2 mb-4">
          {(["1m", "3m", "6m", "1y"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p === "1m" ? "1개월" : p === "3m" ? "3개월" : p === "6m" ? "6개월" : "1년"}
            </button>
          ))}
        </div>
        {loadingPrice ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            차트 로딩 중...
          </div>
        ) : priceData ? (
          <StockChart candles={priceData.candles} ticker={ticker} />
        ) : null}
      </div>

      {/* 기술 지표 */}
      {indicators && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">기술 지표</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">RSI (14)</p>
              <p className="font-semibold">{indicators.rsi.rsi14?.toFixed(1) ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">MACD</p>
              <p className="font-semibold">{indicators.macd.macd?.toFixed(2) ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">볼린저 상단</p>
              <p className="font-semibold">{indicators.bollinger.upper?.toFixed(2) ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">스토캐스틱 K</p>
              <p className="font-semibold">{indicators.stochastic.k?.toFixed(1) ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI 분석 섹션 */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">AI 기술적 분석</h2>
          <button
            onClick={requestAnalysis}
            disabled={loadingAI}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingAI ? "분석 중..." : "AI 분석 요청"}
          </button>
        </div>

        {/* AI 로딩 인디케이터 */}
        {loadingAI && !aiText && (
          <div className="mt-4 flex flex-col items-center gap-3 py-8 text-gray-500">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm">AI가 기술 지표를 분석 중입니다. 최대 1분 정도 소요될 수 있습니다.</p>
            <p className="text-xs text-gray-400">웹 검색을 통해 최신 시장 데이터를 수집하고 있습니다.</p>
          </div>
        )}

        {/* 예측 점수 게이지 */}
        {buyScore && <ScoreGauge score={buyScore} />}

        {/* 분석 텍스트 스트리밍 */}
        {aiText && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
            {aiText}
          </div>
        )}

        {/* 면책 고지 */}
        {(aiText || buyScore) && <Disclaimer />}
      </div>
    </div>
  );
}
