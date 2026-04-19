"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getHistory, getHistoryDetail } from "@/services/api";
import type { HistoryItem, HistoryDetail } from "@/types";
import { getScoreColor } from "@/types";

function cleanText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function ScoreBadge({ score, label }: { score: number | null; label: string | null }) {
  if (score === null) return <span className="text-slate-600">—</span>;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: getScoreColor(score) + "20",
        color: getScoreColor(score),
        border: `1px solid ${getScoreColor(score)}40`,
      }}
    >
      {score} {label}
    </span>
  );
}

function TypeBadge({ type }: { type: "stock" | "comparison" }) {
  return type === "comparison" ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 font-medium">
      비교
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/15 font-medium">
      종목
    </span>
  );
}

function getComparisonTitle(item: HistoryItem): string {
  if (item.tickers_json) {
    try {
      const tickers: string[] = JSON.parse(item.tickers_json);
      return tickers.join(" vs ");
    } catch { /* fallback */ }
  }
  return item.ticker;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string })?.accessToken ?? "";
    getHistory(token)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, status]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const token = (session as { accessToken?: string })?.accessToken ?? "";
      const d = await getHistoryDetail(token, id);
      setDetail(d);
    } catch {
      // 오류 처리
    } finally {
      setDetailLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-50">분석 기록</h1>
        <p className="text-slate-400 text-sm mt-1">나의 AI 분석 기록을 확인하세요</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm">분석 기록이 없습니다.</p>
          <p className="text-slate-600 text-xs mt-1">종목 상세 페이지에서 AI 분석을 요청하면 기록이 저장됩니다.</p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3.5 text-slate-500 font-medium">종목</th>
                <th className="text-left px-4 py-3.5 text-slate-500 font-medium">유형</th>
                <th className="text-left px-4 py-3.5 text-slate-500 font-medium">단기</th>
                <th className="text-left px-4 py-3.5 text-slate-500 font-medium">중기</th>
                <th className="text-left px-4 py-3.5 text-slate-500 font-medium">장기</th>
                <th className="text-right px-6 py-3.5 text-slate-500 font-medium">날짜</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold text-slate-50">
                        {item.analysis_type === "comparison" ? getComparisonTitle(item) : item.ticker}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">{item.market.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <TypeBadge type={item.analysis_type} />
                  </td>
                  <td className="px-4 py-4">
                    {item.analysis_type === "comparison" ? <span className="text-slate-600 text-xs">—</span> : <ScoreBadge score={item.buy_score_short} label={item.buy_score_short_label} />}
                  </td>
                  <td className="px-4 py-4">
                    {item.analysis_type === "comparison" ? <span className="text-slate-600 text-xs">—</span> : <ScoreBadge score={item.buy_score_mid} label={item.buy_score_mid_label} />}
                  </td>
                  <td className="px-4 py-4">
                    {item.analysis_type === "comparison" ? <span className="text-slate-600 text-xs">—</span> : <ScoreBadge score={item.buy_score_long} label={item.buy_score_long_label} />}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 text-xs">
                    {new Date(item.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => openDetail(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-300 transition-all"
                    >
                      자세히
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 모달 */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <p className="text-slate-500 text-sm text-center py-8">불러오는 중...</p>
            ) : detail ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-slate-50">
                        {detail.analysis_type === "comparison" ? getComparisonTitle(detail) : detail.ticker}
                      </h2>
                      <TypeBadge type={detail.analysis_type} />
                    </div>
                    <p className="text-slate-500 text-xs">
                      {new Date(detail.created_at).toLocaleString("ko-KR")} · {detail.market.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetail(null)}
                    className="text-slate-500 hover:text-slate-300 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                {detail.analysis_type === "stock" && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <ScoreBadge score={detail.buy_score_short} label={detail.buy_score_short_label} />
                    <ScoreBadge score={detail.buy_score_mid} label={detail.buy_score_mid_label} />
                    <ScoreBadge score={detail.buy_score_long} label={detail.buy_score_long_label} />
                  </div>
                )}
                <div className="text-sm text-slate-200 leading-7 whitespace-pre-wrap font-light bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  {cleanText(detail.analysis_text)}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
