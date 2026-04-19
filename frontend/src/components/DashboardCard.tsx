"use client";

import type { WatchlistItem, ScoreRankingItem } from "@/types";
import { getScoreLabel, getScoreColor } from "@/types";
import Link from "next/link";

interface DashboardCardProps {
  item: WatchlistItem;
  score?: ScoreRankingItem;
  onClick: () => void;
}

export default function DashboardCard({ item, score, onClick }: DashboardCardProps) {
  const isPositive = item.change_pct >= 0;
  const priceDisplay =
    item.market === "kr"
      ? `${item.current_price.toLocaleString()}원`
      : `$${item.current_price.toFixed(2)}`;

  const totalScore = score?.total_score;
  const scoreLabel = totalScore !== undefined ? getScoreLabel(totalScore) : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
    >
      {/* 헤더: 티커 + 마켓 뱃지 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-50">{item.ticker}</span>
          <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full font-medium">
            {item.market.toUpperCase()}
          </span>
        </div>
        {totalScore !== undefined && (
          <div
            className="text-xs font-bold px-2.5 py-1 rounded-full border"
            style={{
              color: getScoreColor(totalScore),
              borderColor: `${getScoreColor(totalScore)}40`,
              backgroundColor: `${getScoreColor(totalScore)}15`,
            }}
          >
            {scoreLabel}
          </div>
        )}
      </div>

      {/* 종목명 */}
      <p className="text-slate-400 text-sm mb-4 truncate">{item.display_name}</p>

      {/* 가격 정보 */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-slate-50">{priceDisplay}</p>
          <p
            className={`text-sm font-medium mt-0.5 ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(item.change_pct).toFixed(2)}%
          </p>
        </div>

        {totalScore !== undefined && (
          <div className="text-right">
            <p className="text-3xl font-black" style={{ color: getScoreColor(totalScore) }}>
              {totalScore}
            </p>
            <p className="text-xs text-slate-500">/ 100</p>
          </div>
        )}
      </div>

      {/* AI 점수 세부 (있는 경우) */}
      {score && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
          {[
            { label: "단기", value: score.buy_score.short_term.score },
            { label: "중기", value: score.buy_score.mid_term.score },
            { label: "장기", value: score.buy_score.long_term.score },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p
                className="text-sm font-bold"
                style={{ color: getScoreColor(value) }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* AI 분석 미완료 */}
      {!score && (
        <div className="pt-3 border-t border-white/5">
          <Link
            href={`/stock/${item.ticker}?market=${item.market}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            AI 분석 실행하기 →
          </Link>
        </div>
      )}
    </button>
  );
}
