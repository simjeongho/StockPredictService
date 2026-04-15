"use client";

import type { WatchlistItem } from "@/types";

interface WatchlistCardProps {
  item: WatchlistItem;
  onRemove?: (ticker: string) => void;
}

export default function WatchlistCard({ item, onRemove }: WatchlistCardProps) {
  const isPositive = item.change_pct >= 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{item.ticker}</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
            {item.market.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-gray-500">{item.display_name}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold">
            {item.market === "kr"
              ? `${item.current_price.toLocaleString()}원`
              : `$${item.current_price.toFixed(2)}`}
          </p>
          <p className={`text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? "▲" : "▼"} {Math.abs(item.change_pct).toFixed(2)}%
          </p>
        </div>

        {onRemove && (
          <button
            onClick={() => onRemove(item.ticker)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="관심 종목 삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
