"use client";

import type { WatchlistItem } from "@/types";

interface WatchlistCardProps {
  item: WatchlistItem;
  onRemove?: (ticker: string) => void;
}

export default function WatchlistCard({ item, onRemove }: WatchlistCardProps) {
  const isPositive = item.change_pct >= 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-50">{item.ticker}</span>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-400">
            {item.market.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-slate-400">{item.display_name}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold text-slate-50">
            {item.market === "kr"
              ? `${item.current_price.toLocaleString()}원`
              : `$${item.current_price.toFixed(2)}`}
          </p>
          <p className={`text-sm ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositive ? "▲" : "▼"} {Math.abs(item.change_pct).toFixed(2)}%
          </p>
        </div>

        {onRemove && (
          <button
            onClick={() => onRemove(item.ticker)}
            className="text-slate-600 hover:text-rose-400 transition-colors p-1"
            title="관심 종목 삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
