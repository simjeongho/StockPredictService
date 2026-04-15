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
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h1 className="text-2xl font-bold mb-1">AI 주식 챗봇</h1>
        <p className="text-sm text-gray-500">
          종목 관련 질문을 자유롭게 입력하세요. 특정 종목을 선택하면 해당 종목
          데이터를 기반으로 더 정확한 답변을 드립니다.
        </p>
      </div>

      {/* 종목 선택 (선택적) */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">
          종목 선택 (선택사항)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApplyTicker()}
            placeholder="티커 입력 (예: AAPL)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as "us" | "kr")}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="us">미국</option>
            <option value="kr">한국</option>
          </select>
          <button
            onClick={handleApplyTicker}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            적용
          </button>
          {activeTicker && (
            <button
              onClick={() => {
                setActiveTicker(undefined);
                setTicker("");
              }}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            >
              초기화
            </button>
          )}
        </div>
        {activeTicker && (
          <p className="mt-2 text-xs text-blue-600">
            현재 선택: <strong>{activeTicker}</strong> ({activeMarket.toUpperCase()})
          </p>
        )}
      </div>

      {/* 챗봇 인터페이스 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ChatInterface
          ticker={activeTicker}
          market={activeTicker ? activeMarket : undefined}
          token={token}
        />
      </div>

      {/* 면책 고지 */}
      <Disclaimer />
    </div>
  );
}
