"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ChatInterface from "@/components/ChatInterface";
import Disclaimer from "@/components/Disclaimer";

export default function ChatPage() {
  const { data: session } = useSession();
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState<"us" | "kr">("us");
  const [activeTicker, setActiveTicker] = useState<string | undefined>();
  const [activeMarket, setActiveMarket] = useState<"us" | "kr">("us");

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  const handleApplyTicker = () => {
    const t = ticker.trim().toUpperCase();
    if (t) {
      setActiveTicker(t);
      setActiveMarket(market);
    } else {
      setActiveTicker(undefined);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-50 mb-1">AI 주식 챗봇</h1>
        <p className="text-sm text-slate-400">
          종목 관련 질문을 자유롭게 입력하세요. 특정 종목을 선택하면 해당 종목
          데이터를 기반으로 더 정확한 답변을 드립니다.
        </p>
      </div>

      {/* 종목 선택 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <p className="text-sm font-medium text-slate-300 mb-2">
          종목 선택 <span className="text-slate-500">(선택사항)</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApplyTicker()}
            placeholder="티커 입력 (예: AAPL)"
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 text-slate-50 placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
          />
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as "us" | "kr")}
            className="px-3 py-2 bg-white/10 border border-white/20 text-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
          >
            <option value="us" className="bg-slate-800">미국</option>
            <option value="kr" className="bg-slate-800">한국</option>
          </select>
          <button
            onClick={handleApplyTicker}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl text-sm transition-all"
          >
            적용
          </button>
          {activeTicker && (
            <button
              onClick={() => {
                setActiveTicker(undefined);
                setTicker("");
              }}
              className="px-3 py-2 bg-white/5 text-slate-400 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
        {activeTicker && (
          <p className="mt-2 text-xs text-violet-400">
            현재 선택: <strong>{activeTicker}</strong> ({activeMarket.toUpperCase()})
          </p>
        )}
      </div>

      {/* 챗봇 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <ChatInterface
          ticker={activeTicker}
          market={activeTicker ? activeMarket : undefined}
          token={token}
        />
      </div>

      <Disclaimer />
    </div>
  );
}
