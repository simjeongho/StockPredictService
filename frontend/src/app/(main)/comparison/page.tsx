"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import StockChart from "@/components/StockChart";
import Disclaimer from "@/components/Disclaimer";
import { getPrice } from "@/services/api";
import type { PriceResponse, ComparisonEvent } from "@/types";

function cleanText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export default function ComparisonPage() {
  const { data: session } = useSession();
  const [tickerInputs, setTickerInputs] = useState(["", ""]);
  const [market, setMarket] = useState<"us" | "kr">("us");
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [priceDataMap, setPriceDataMap] = useState<Record<string, PriceResponse>>({});
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const addTicker = () => {
    if (tickerInputs.length < 4) setTickerInputs((prev) => [...prev, ""]);
  };

  const removeTicker = (idx: number) => {
    if (tickerInputs.length > 2) setTickerInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTicker = (idx: number, val: string) => {
    setTickerInputs((prev) => prev.map((t, i) => (i === idx ? val.toUpperCase() : t)));
  };

  const requestComparison = async () => {
    const tickers = tickerInputs.map((t) => t.trim()).filter(Boolean);
    if (tickers.length < 2) {
      setError("최소 2개 종목을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setAnalysisText("");
    setError("");
    setPriceDataMap({});
    setSaveStatus("idle");

    // 차트 데이터 로드
    const priceResults = await Promise.allSettled(tickers.map((t) => getPrice(t, "1m")));
    const newPriceMap: Record<string, PriceResponse> = {};
    priceResults.forEach((r, i) => {
      if (r.status === "fulfilled") newPriceMap[tickers[i]] = r.value;
    });
    setPriceDataMap(newPriceMap);

    const token = (session as { accessToken?: string })?.accessToken ?? "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/comparison`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ tickers, market }),
        }
      );

      if (!res.ok || !res.body) {
        setError("비교 분석 요청에 실패했습니다.");
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
            const event: ComparisonEvent = JSON.parse(payload);
            if (event.type === "text" && event.text) {
              setAnalysisText((prev) => prev + event.text);
            } else if (event.type === "error" && event.text) {
              setError(event.text);
            } else if (event.type === "saved") {
              setSaveStatus("saved");
            } else if (event.type === "save_error") {
              setSaveStatus("error");
            }
          } catch {
            // JSON 파싱 오류 무시
          }
        }
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const tickers = tickerInputs.map((t) => t.trim()).filter(Boolean);
  const displayText = cleanText(analysisText);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-50">종목 비교 분석</h1>
        <p className="text-slate-400 text-sm mt-1">2~4개 종목을 비교 분석합니다 (하루 10회 한도)</p>
      </div>

      {/* 입력 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          {tickerInputs.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={t}
                onChange={(e) => updateTicker(i, e.target.value)}
                placeholder={`종목 ${i + 1} (예: AAPL)`}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 text-sm w-36"
              />
              {tickerInputs.length > 2 && (
                <button
                  onClick={() => removeTicker(i)}
                  className="text-slate-500 hover:text-rose-400 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {tickerInputs.length < 4 && (
            <button
              onClick={addTicker}
              className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-dashed border-white/10 hover:border-white/20 hover:text-slate-300 transition-all"
            >
              + 종목 추가
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {(["us", "kr"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  market === m
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {m === "us" ? "미국" : "한국"}
              </button>
            ))}
          </div>
          <button
            onClick={requestComparison}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
          >
            {loading ? "분석 중..." : "비교 분석"}
          </button>
        </div>

        {error && <p className="text-rose-400 text-sm">{error}</p>}
      </div>

      {/* 미니 차트 그리드 */}
      {tickers.length > 0 && Object.keys(priceDataMap).length > 0 && (
        <div className={`grid gap-4 ${tickers.length === 2 ? "grid-cols-2" : tickers.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {tickers.map((t) =>
            priceDataMap[t] ? (
              <div key={t} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                <h3 className="text-base font-semibold text-slate-50 mb-3">{t}</h3>
                <StockChart candles={priceDataMap[t].candles} ticker={t} market={market} />
              </div>
            ) : null
          )}
        </div>
      )}

      {/* 로딩 */}
      {loading && !analysisText && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-slate-400">Claude AI가 종목을 비교 분석 중입니다</p>
        </div>
      )}

      {/* 분석 결과 */}
      {displayText && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-50">비교 분석 결과</h2>
            {saveStatus === "saved" && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                기록 저장됨
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 font-medium">
                저장 실패
              </span>
            )}
          </div>
          <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-slate-200 leading-7 whitespace-pre-wrap font-light">
            {displayText}
            {loading && <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 animate-pulse" />}
          </div>
          {!loading && (
            <div className="mt-4">
              <Disclaimer />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
