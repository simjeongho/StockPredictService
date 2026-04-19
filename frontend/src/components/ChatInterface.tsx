"use client";

import { useState, useRef, useEffect } from "react";
import Disclaimer from "@/components/Disclaimer";
import type { AnalysisEvent } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  hasDisclaimer?: boolean;
}

interface ChatInterfaceProps {
  ticker?: string;
  market?: "us" | "kr";
  token?: string;
}

export default function ChatInterface({ ticker, market, token }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", hasDisclaimer: false },
    ]);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ticker, market, message: text }),
        }
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasDisclaimer = false;

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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.text! }
                    : m
                )
              );
            } else if (event.type === "disclaimer") {
              hasDisclaimer = true;
            } else if (event.type === "out_of_scope") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: "주식 분석 관련 질문만 지원합니다. 종목 분석, 지표 해석 등을 질문해 주세요." }
                    : m
                )
              );
            }
          } catch {
            // JSON 파싱 오류 무시
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, hasDisclaimer } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "오류가 발생했습니다. 다시 시도해 주세요." }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-8">
            종목 관련 질문을 입력하세요.
            <br />
            예: &quot;AAPL의 RSI는 과매수 구간인가요?&quot;
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                  : "bg-white/10 text-slate-200 border border-white/10"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {/* 타이핑 인디케이터 */}
              {streaming && msg.role === "assistant" && msg.content === "" && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
              {msg.hasDisclaimer && (
                <Disclaimer variant="compact" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder="질문을 입력하세요..."
          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-slate-50 placeholder:text-slate-500 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full text-sm hover:from-purple-500 hover:to-blue-400 disabled:opacity-50 transition-all"
        >
          전송
        </button>
      </form>
    </div>
  );
}
