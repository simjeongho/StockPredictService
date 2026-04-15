"use client";

import { useEffect, useRef } from "react";
import type { Candle } from "@/types";

interface StockChartProps {
  candles: Candle[];
  ticker: string;
}

export default function StockChart({ candles, ticker }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    import("lightweight-charts").then(({ createChart, ColorType }) => {
      if (!chartContainerRef.current) return;

      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#374151",
        },
        width: chartContainerRef.current.clientWidth,
        height: 300,
        grid: {
          vertLines: { color: "#f3f4f6" },
          horzLines: { color: "#f3f4f6" },
        },
        timeScale: {
          borderColor: "#e5e7eb",
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      candleSeries.setData(
        candles.map((c) => ({
          time: c.time as `${number}-${number}-${number}`,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      chart.timeScale().fitContent();

      // 반응형 리사이즈
      const handleResize = () => {
        if (chart && chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart?.remove();
      };
    });

    return () => {
      chart?.remove();
    };
  }, [candles, ticker]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-lg overflow-hidden border border-gray-200"
      style={{ minHeight: 300 }}
    />
  );
}
