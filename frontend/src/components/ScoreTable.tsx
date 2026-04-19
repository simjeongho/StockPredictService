"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getScoreColor, getScoreLabel } from "@/types";
import type { ScoreRankingItem } from "@/types";

interface ScoreTableProps {
  items: ScoreRankingItem[];
  sortBy: "short" | "mid" | "long" | "total";
  onSortChange: (sort: "short" | "mid" | "long" | "total") => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color }}>
        {score}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function ScoreTable({ items, sortBy, onSortChange }: ScoreTableProps) {
  const router = useRouter();
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const SORT_TABS: { key: "short" | "mid" | "long" | "total"; label: string }[] = [
    { key: "short", label: "단기 (1주)" },
    { key: "mid", label: "중기 (3개월)" },
    { key: "long", label: "장기 (1년)" },
    { key: "total", label: "종합" },
  ];

  return (
    <div className="space-y-3">
      {/* 정렬 탭 */}
      <div className="flex gap-1 overflow-x-auto">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSortChange(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              sortBy === tab.key
                ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md shadow-purple-500/20"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 font-medium text-slate-400">종목</th>
              <th className="text-center py-3 px-4 font-medium text-slate-400">현재가</th>
              <th className="text-center py-3 px-4 font-medium text-slate-400">단기 (1주)</th>
              <th className="text-center py-3 px-4 font-medium text-slate-400">중기 (3개월)</th>
              <th className="text-center py-3 px-4 font-medium text-slate-400">장기 (1년)</th>
              <th className="text-center py-3 px-4 font-medium text-slate-400">종합</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <>
                <tr
                  key={item.ticker}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() =>
                    setExpandedTicker(
                      expandedTicker === item.ticker ? null : item.ticker
                    )
                  }
                >
                  <td className="py-3 px-4">
                    <button
                      className="text-left hover:text-purple-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/stock/${item.ticker}?market=${item.market}`);
                      }}
                    >
                      <div className="font-semibold text-slate-50">{item.ticker}</div>
                      <div className="text-xs text-slate-500">{item.display_name}</div>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="text-slate-200">
                      {item.market === "kr"
                        ? `${item.current_price.toLocaleString()}원`
                        : item.current_price > 0
                        ? `$${item.current_price.toFixed(2)}`
                        : "—"}
                    </div>
                    {item.change_pct !== 0 && (
                      <div
                        className={`text-xs ${
                          item.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {item.change_pct >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(item.change_pct).toFixed(2)}%
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={item.buy_score.short_term.score} />
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={item.buy_score.mid_term.score} />
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={item.buy_score.long_term.score} />
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={item.total_score} />
                  </td>
                </tr>
                {expandedTicker === item.ticker && item.score_rationale && (
                  <tr key={`${item.ticker}-rationale`} className="bg-purple-950/30">
                    <td colSpan={6} className="px-4 py-3 text-sm text-slate-300">
                      <span className="font-medium text-violet-400">점수 근거: </span>
                      {item.score_rationale}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 레이아웃 */}
      <div className="sm:hidden space-y-3">
        {items.map((item) => (
          <div key={item.ticker} className="border border-white/10 bg-white/5 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <button
                className="text-left hover:text-purple-400 transition-colors"
                onClick={() =>
                  router.push(`/stock/${item.ticker}?market=${item.market}`)
                }
              >
                <div className="font-semibold text-slate-50">{item.ticker}</div>
                <div className="text-xs text-slate-500">{item.display_name}</div>
              </button>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-200">
                  {item.market === "kr"
                    ? `${item.current_price.toLocaleString()}원`
                    : item.current_price > 0
                    ? `$${item.current_price.toFixed(2)}`
                    : "—"}
                </div>
                {item.change_pct !== 0 && (
                  <div
                    className={`text-xs ${
                      item.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.change_pct >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(item.change_pct).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "단기", score: item.buy_score.short_term.score },
                { label: "중기", score: item.buy_score.mid_term.score },
                { label: "장기", score: item.buy_score.long_term.score },
                { label: "종합", score: item.total_score },
              ].map(({ label, score }) => (
                <div key={label}>
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <ScoreBadge score={score} />
                </div>
              ))}
            </div>
            {item.score_rationale && (
              <button
                className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                onClick={() =>
                  setExpandedTicker(
                    expandedTicker === item.ticker ? null : item.ticker
                  )
                }
              >
                {expandedTicker === item.ticker ? "근거 숨기기" : "점수 근거 보기"}
              </button>
            )}
            {expandedTicker === item.ticker && item.score_rationale && (
              <div className="mt-2 p-3 bg-purple-950/30 rounded-lg text-xs text-slate-300">
                {item.score_rationale}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
