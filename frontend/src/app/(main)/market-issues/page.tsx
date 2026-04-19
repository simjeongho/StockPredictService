"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Disclaimer from "@/components/Disclaimer";

interface MarketIssueEvent {
  type: "text" | "error" | "cached" | "done";
  text?: string;
  cached_at?: string;
  usage?: { used: number; limit: number };
}

export default function MarketIssuesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [issuesText, setIssuesText] = useState("");
  const [error, setError] = useState("");
  const [isCached, setIsCached] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  const loadIssues = async () => {
    setLoading(true);
    setIssuesText("");
    setError("");
    setIsCached(false);
    setCachedAt(null);
    setUsage(null);

    const token = (session as { accessToken?: string })?.accessToken ?? "";
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/market/issues`,
        { headers }
      );

      if (!res.ok || !res.body) {
        setError("시장 이슈를 불러오지 못했습니다.");
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
            const event: MarketIssueEvent = JSON.parse(payload);
            if (event.type === "cached") {
              setIsCached(true);
              if (event.cached_at) setCachedAt(event.cached_at);
              if (event.usage) setUsage(event.usage);
            } else if (event.type === "text" && event.text) {
              setIssuesText((prev) => prev + event.text);
            } else if (event.type === "error" && event.text) {
              setError(event.text);
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
      // 캐시 히트가 아닌 경우 usage를 별도 조회
      if (!isCached) {
        const token = (session as { accessToken?: string })?.accessToken ?? "";
        try {
          const { getMarketIssuesUsage } = await import("@/services/api");
          const u = await getMarketIssuesUsage(token);
          setUsage(u);
        } catch { /* ignore */ }
      }
    }
  };

  useEffect(() => {
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">시장 주요 이슈</h1>
            <p className="text-slate-400 text-sm mt-1">Claude AI · 최신 시장 뉴스 기반 분석 (4시간 캐시)</p>
          </div>
          <button
            onClick={loadIssues}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-all"
          >
            {loading ? "로딩 중..." : "새로고침"}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {isCached && cachedAt && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
              캐시된 결과 · {new Date(cachedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
            </span>
          )}
          {usage && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              usage.used >= usage.limit
                ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
                : "bg-white/5 text-slate-400 border-white/10"
            }`}>
              오늘 호출 {usage.used}/{usage.limit}
            </span>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {loading && !issuesText && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-slate-400">Claude AI가 최신 시장 이슈를 분석 중입니다</p>
          <p className="text-xs text-slate-600">웹 검색을 통해 최신 데이터를 수집하고 있습니다</p>
        </div>
      )}

      {/* 오류 */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {/* 이슈 내용 */}
      {issuesText && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="text-sm text-slate-200 leading-8 whitespace-pre-wrap font-light">
            {issuesText}
            {loading && <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 animate-pulse" />}
          </div>
          {!loading && (
            <div className="mt-6">
              <Disclaimer />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
