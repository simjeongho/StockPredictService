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

function cleanAiText(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
  const [isCached, setIsCached] = useState(false);

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

  const requestAnalysis = async () => {
    setLoadingAI(true);
    setAiText("");
    setBuyScore(null);
    setIsCached(false);

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

      if (!res.ok || !res.body) {
        setAiText("AI 분석 요청에 실패했습니다. 백엔드 서버가 실행 중인지 확인해 주세요.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
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
            if (event.type === "cached") {
              setIsCached(true);
            } else if (event.type === "text" && event.text) {
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
      setAiText("AI 분석 요청 중 네트워크 오류가 발생했습니다. 백엔드 서버 연결을 확인해 주세요.");
    } finally {
      setLoadingAI(false);
    }
  };

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
  const displayText = cleanAiText(aiText);

  return (
    <div className="space-y-6">
      {/* 종목 헤더 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">{ticker.toUpperCase()}</h1>
            <p className="text-slate-400 text-sm">{market.toUpperCase()}</p>
            {price && (
              <div className="mt-2">
                <span className="text-3xl font-semibold text-slate-50">
                  {market === "kr"
                    ? `${price.current.toLocaleString()}원`
                    : `$${price.current.toFixed(2)}`}
                </span>
                <span
                  className={`ml-3 text-lg ${
                    price.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {price.change_pct >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(price.change_pct).toFixed(2)}%
                </span>
              </div>
            )}
            {staleData && (
              <p className="text-xs text-amber-400/70 mt-1">
                ⚠️ 장 마감 데이터 · 마지막 업데이트: {priceData?.last_updated?.slice(0, 10)}
              </p>
            )}
          </div>
          <button
            onClick={toggleWatchlist}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isInWatchlist
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            {isInWatchlist ? "★ 관심 종목 해제" : "☆ 관심 종목 추가"}
          </button>
        </div>
      </div>

      {/* 차트 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex gap-2 mb-4">
          {(["1m", "3m", "6m", "1y"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md shadow-purple-500/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
              }`}
            >
              {p === "1m" ? "1개월" : p === "3m" ? "3개월" : p === "6m" ? "6개월" : "1년"}
            </button>
          ))}
        </div>
        {loadingPrice ? (
          <div className="h-[360px] flex items-center justify-center text-slate-500">
            차트 로딩 중...
          </div>
        ) : priceData ? (
          <StockChart candles={priceData.candles} ticker={ticker} market={market} />
        ) : (
          <div className="h-[360px] flex items-center justify-center text-slate-500 text-sm">
            차트 데이터를 불러올 수 없습니다.
          </div>
        )}
      </div>

      {/* 기술 지표 */}
      {indicators && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">기술 지표</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "RSI (14)", value: indicators.rsi.rsi14?.toFixed(1), hint: indicators.rsi.rsi14 ? (indicators.rsi.rsi14 > 70 ? "과매수" : indicators.rsi.rsi14 < 30 ? "과매도" : "중립") : null },
              { label: "MACD", value: indicators.macd.macd?.toFixed(2), hint: indicators.macd.histogram ? (indicators.macd.histogram > 0 ? "상승세" : "하락세") : null },
              { label: "볼린저 상단", value: market === "kr" ? indicators.bollinger.upper?.toLocaleString() : `$${indicators.bollinger.upper?.toFixed(2)}`, hint: null },
              { label: "스토캐스틱 K", value: indicators.stochastic.k?.toFixed(1), hint: indicators.stochastic.k ? (indicators.stochastic.k > 80 ? "과매수" : indicators.stochastic.k < 20 ? "과매도" : null) : null },
            ].map(({ label, value, hint }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-slate-500 text-xs mb-1">{label}</p>
                <p className="font-bold text-slate-50 text-xl">{value ?? "—"}</p>
                {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
              </div>
            ))}
          </div>
          {/* SMA 보조 지표 */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "SMA 5", value: indicators.sma?.sma5, color: "#F59E0B" },
              { label: "SMA 20", value: indicators.sma?.sma20, color: "#3B82F6" },
              { label: "SMA 50", value: indicators.sma?.sma50, color: "#EC4899" },
              { label: "SMA 200", value: indicators.sma?.sma200, color: "#8B5CF6" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-[2px] rounded-full inline-block" style={{ backgroundColor: color }} />
                  <p className="text-slate-500 text-[11px]">{label}</p>
                </div>
                <p className="font-medium text-slate-200 text-sm">
                  {value ? (market === "kr" ? value.toLocaleString() : `$${value.toFixed(2)}`) : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 분석 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">AI 기술적 분석</h2>
            <p className="text-xs text-slate-500 mt-0.5">Claude AI · 기술 지표 기반 분석</p>
          </div>
          <button
            onClick={requestAnalysis}
            disabled={loadingAI}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
          >
            {loadingAI ? "분석 중..." : "AI 분석 요청"}
          </button>
        </div>

        {/* 로딩 상태 */}
        {loadingAI && !aiText && (
          <div className="mt-4 flex flex-col items-center gap-3 py-10">
            <div className="flex gap-2">
              <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm text-slate-400 font-medium">Claude AI가 기술 지표를 분석 중입니다</p>
            <p className="text-xs text-slate-600">최신 시장 데이터를 수집하고 있습니다. 최대 2분 소요될 수 있습니다.</p>
          </div>
        )}

        {/* 캐시 배지 */}
        {isCached && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
              캐시된 분석 결과
            </span>
          </div>
        )}

        {/* 점수 게이지 */}
        {buyScore && <ScoreGauge score={buyScore} />}

        {/* AI 분석 텍스트 (스트리밍) */}
        {displayText && (
          <div className="mt-4 p-5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-slate-200 leading-7 whitespace-pre-wrap font-light">
            {displayText}
            {loadingAI && (
              <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 animate-pulse" />
            )}
          </div>
        )}

        {(displayText || buyScore) && (
          <div className="mt-4">
            <Disclaimer />
          </div>
        )}
      </div>
    </div>
  );
}
