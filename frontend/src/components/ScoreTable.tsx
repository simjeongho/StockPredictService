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
      <div
        className="text-lg font-bold"
        style={{ color }}
      >
        {score}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
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
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">종목</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">현재가</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">단기 (1주)</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">중기 (3개월)</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">장기 (1년)</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">종합</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <>
                <tr
                  key={item.ticker}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    setExpandedTicker(
                      expandedTicker === item.ticker ? null : item.ticker
                    )
                  }
                >
                  <td className="py-3 px-4">
                    <button
                      className="text-left hover:text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/stock/${item.ticker}?market=${item.market}`);
                      }}
                    >
                      <div className="font-semibold">{item.ticker}</div>
                      <div className="text-xs text-gray-500">{item.display_name}</div>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div>
                      {item.market === "kr"
                        ? `${item.current_price.toLocaleString()}원`
                        : item.current_price > 0
                        ? `$${item.current_price.toFixed(2)}`
                        : "—"}
                    </div>
                    {item.change_pct !== 0 && (
                      <div
                        className={`text-xs ${
                          item.change_pct >= 0 ? "text-green-600" : "text-red-600"
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
                  <tr key={`${item.ticker}-rationale`} className="bg-blue-50">
                    <td colSpan={6} className="px-4 py-3 text-sm text-gray-700">
                      <span className="font-medium">점수 근거: </span>
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
          <div key={item.ticker} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <button
                className="text-left hover:text-blue-600"
                onClick={() =>
                  router.push(`/stock/${item.ticker}?market=${item.market}`)
                }
              >
                <div className="font-semibold">{item.ticker}</div>
                <div className="text-xs text-gray-500">{item.display_name}</div>
              </button>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {item.market === "kr"
                    ? `${item.current_price.toLocaleString()}원`
                    : item.current_price > 0
                    ? `$${item.current_price.toFixed(2)}`
                    : "—"}
                </div>
                {item.change_pct !== 0 && (
                  <div
                    className={`text-xs ${
                      item.change_pct >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.change_pct >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(item.change_pct).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">단기</div>
                <ScoreBadge score={item.buy_score.short_term.score} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">중기</div>
                <ScoreBadge score={item.buy_score.mid_term.score} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">장기</div>
                <ScoreBadge score={item.buy_score.long_term.score} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">종합</div>
                <ScoreBadge score={item.total_score} />
              </div>
            </div>
            {item.score_rationale && (
              <button
                className="mt-3 text-xs text-blue-600 hover:underline"
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
              <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-gray-700">
                {item.score_rationale}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
