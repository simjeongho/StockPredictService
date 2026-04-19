"use client";

import { useEffect, useRef, useMemo } from "react";
import type { Candle } from "@/types";

export type CandleType = "daily" | "weekly" | "monthly";

interface StockChartProps {
  candles: Candle[];
  ticker: string;
  market?: "us" | "kr";
  candleType?: CandleType;
}

function aggregateCandles(candles: Candle[], type: CandleType): Candle[] {
  if (type === "daily") return candles;

  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const d = new Date(c.time);
    let key: string;
    if (type === "weekly") {
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      key = monday.toISOString().slice(0, 10);
    } else {
      key = c.time.slice(0, 7) + "-01";
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, cs]) => ({
      time,
      open: cs[0].open,
      high: Math.max(...cs.map((c) => c.high)),
      low: Math.min(...cs.map((c) => c.low)),
      close: cs[cs.length - 1].close,
      volume: cs.reduce((s, c) => s + c.volume, 0),
    }));
}

// n-기간 단순이동평균
function computeSMA(candles: Candle[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    result.push({ time: candles[i].time, value: sum / period });
  }
  return result;
}

// 볼린저 밴드 (period=20, 표준편차 배수=2)
function computeBollinger(candles: Candle[], period = 20, stdMult = 2) {
  const upper: { time: string; value: number }[] = [];
  const middle: { time: string; value: number }[] = [];
  const lower: { time: string; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (candles[j].close - mean) ** 2;
    const std = Math.sqrt(variance / period);
    upper.push({ time: candles[i].time, value: mean + stdMult * std });
    middle.push({ time: candles[i].time, value: mean });
    lower.push({ time: candles[i].time, value: mean - stdMult * std });
  }
  return { upper, middle, lower };
}

// Wilder's RSI (14기간)
function computeRSI(candles: Candle[], period = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  if (candles.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    if (delta > 0) avgGain += delta / period;
    else avgLoss += Math.abs(delta) / period;
  }

  const rsi0 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  result.push({ time: candles[period].time, value: rsi0 });

  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push({ time: candles[i].time, value: rsi });
  }
  return result;
}

const MA_CONFIGS = [
  { period: 5, color: "#F59E0B", label: "MA5" },
  { period: 20, color: "#3B82F6", label: "MA20" },
  { period: 60, color: "#EC4899", label: "MA60" },
  { period: 200, color: "#8B5CF6", label: "MA200" },
];

export default function StockChart({ candles, ticker, market = "us", candleType = "daily" }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const displayCandles = useMemo(() => aggregateCandles(candles, candleType), [candles, candleType]);

  useEffect(() => {
    if (!chartContainerRef.current || displayCandles.length === 0) return;

    // unmounted 플래그: async import 완료 전에 cleanup이 실행되면 chart 생성 자체를 막음
    let unmounted = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;

    // 미리 계산 (시간 → 값 Map으로 변환해 O(1) 조회)
    const rsiData = computeRSI(displayCandles, 14);
    const rsiMap = new Map(rsiData.map((d) => [d.time, d.value]));

    const bbData = computeBollinger(displayCandles, 20, 2);
    const bbUpperMap = new Map(bbData.upper.map((d) => [d.time, d.value]));
    const bbMiddleMap = new Map(bbData.middle.map((d) => [d.time, d.value]));
    const bbLowerMap = new Map(bbData.lower.map((d) => [d.time, d.value]));

    const pricePrefix = market === "kr" ? "₩" : "$";
    const fmtPrice = (v: number) =>
      market === "kr"
        ? v.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
        : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 반응형 리사이즈 — cleanup에서 정확히 제거할 수 있도록 async 블록 바깥에 정의
    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    import("lightweight-charts").then(({ createChart, ColorType }) => {
      if (unmounted || !chartContainerRef.current) return;

      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#0f172a" },
          textColor: "#94A3B8",
        },
        width: chartContainerRef.current.clientWidth,
        height: 360,
        grid: {
          vertLines: { color: "#1e293b" },
          horzLines: { color: "#1e293b" },
        },
        timeScale: { borderColor: "#1e293b", timeVisible: false },
        rightPriceScale: { borderColor: "#1e293b" },
        crosshair: {
          vertLine: { color: "#475569", width: 1 },
          horzLine: { color: "#475569", width: 1 },
        },
      });

      // 캔들스틱
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candleSeries: any = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      candleSeries.setData(
        displayCandles.map((c) => ({
          time: c.time as `${number}-${number}-${number}`,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      // 이동평균선
      for (const { period, color } of MA_CONFIGS) {
        if (displayCandles.length < period) continue;
        const maData = computeSMA(displayCandles, period);
        const maSeries = chart.addLineSeries({
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crossHairMarkerVisible: false,
        });
        maSeries.setData(
          maData.map((d) => ({
            time: d.time as `${number}-${number}-${number}`,
            value: d.value,
          }))
        );
      }

      // 볼린저 밴드 (상단/하단 — 중간은 MA20과 동일)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bbUpperSeries: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bbLowerSeries: any = null;

      if (displayCandles.length >= 20) {
        bbUpperSeries = chart.addLineSeries({
          color: "#22d3ee",
          lineWidth: 1,
          lineStyle: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crossHairMarkerVisible: false,
        });
        bbUpperSeries.setData(
          bbData.upper.map((d) => ({
            time: d.time as `${number}-${number}-${number}`,
            value: d.value,
          }))
        );

        bbLowerSeries = chart.addLineSeries({
          color: "#22d3ee",
          lineWidth: 1,
          lineStyle: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crossHairMarkerVisible: false,
        });
        bbLowerSeries.setData(
          bbData.lower.map((d) => ({
            time: d.time as `${number}-${number}-${number}`,
            value: d.value,
          }))
        );
      }

      chart.timeScale().fitContent();

      // ─── crosshairMove 툴팁 ───────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.subscribeCrosshairMove((param: any) => {
        const tip = tooltipRef.current;
        const container = chartContainerRef.current;
        if (!tip || !container) return;

        // 유효하지 않은 포지션이면 숨김
        if (
          !param.time ||
          !param.point ||
          param.point.x < 0 ||
          param.point.y < 0 ||
          param.point.x > container.clientWidth ||
          param.point.y > container.clientHeight
        ) {
          tip.style.display = "none";
          return;
        }

        // 캔들 데이터
        const candle = param.seriesData.get(candleSeries);
        if (!candle || candle.open === undefined) {
          tip.style.display = "none";
          return;
        }

        // 시간 문자열
        const timeStr =
          typeof param.time === "string"
            ? param.time
            : typeof param.time === "number"
            ? new Date(param.time * 1000).toISOString().slice(0, 10)
            : String(param.time);

        const rsi = rsiMap.get(timeStr);
        const bbU = bbUpperMap.get(timeStr);
        const bbM = bbMiddleMap.get(timeStr);
        const bbL = bbLowerMap.get(timeStr);

        const isUp = candle.close >= candle.open;
        const closeColor = isUp ? "#22c55e" : "#ef4444";

        const row = (label: string, value: string, color = "#e2e8f0") =>
          `<div style="display:flex;justify-content:space-between;gap:16px;line-height:1.6">
             <span style="color:#64748b">${label}</span>
             <span style="color:${color};font-weight:500">${value}</span>
           </div>`;

        const divider = `<div style="border-top:1px solid rgba(255,255,255,0.06);margin:4px 0"></div>`;

        tip.innerHTML = `
          <div style="font-size:11px;color:#64748b;margin-bottom:5px;letter-spacing:0.03em">${timeStr}</div>
          ${row("시가", `${pricePrefix}${fmtPrice(candle.open)}`)}
          ${row("고가", `${pricePrefix}${fmtPrice(candle.high)}`, "#22c55e")}
          ${row("저가", `${pricePrefix}${fmtPrice(candle.low)}`, "#ef4444")}
          ${row("종가", `${pricePrefix}${fmtPrice(candle.close)}`, closeColor)}
          ${bbU !== undefined ? `${divider}
          ${row("BB 상단", `${pricePrefix}${fmtPrice(bbU)}`, "#22d3ee")}
          ${row("BB 중간", `${pricePrefix}${fmtPrice(bbM ?? 0)}`, "#3B82F6")}
          ${row("BB 하단", `${pricePrefix}${fmtPrice(bbL ?? 0)}`, "#22d3ee")}` : ""}
          ${rsi !== undefined ? `${divider}${row("RSI(14)", rsi.toFixed(1), rsi > 70 ? "#ef4444" : rsi < 30 ? "#22c55e" : "#f59e0b")}` : ""}
        `;

        // 툴팁 위치 — 오른쪽 공간 없으면 왼쪽으로
        tip.style.display = "block";
        const tw = tip.offsetWidth || 190;
        const th = tip.offsetHeight || 160;
        const margin = 14;

        let left = param.point.x + margin;
        if (left + tw > container.clientWidth - 4) {
          left = param.point.x - tw - margin;
        }
        let top = param.point.y - th / 2;
        top = Math.max(4, Math.min(top, container.clientHeight - th - 4));

        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
      });

    });

    return () => {
      unmounted = true;
      window.removeEventListener("resize", handleResize);
      chart?.remove();
      chart = null;
    };
  }, [displayCandles, ticker, market]);

  const visibleMAs = MA_CONFIGS.filter((m) => displayCandles.length >= m.period);
  const showBollinger = displayCandles.length >= 20;

  return (
    <div className="space-y-3">
      {/* 차트 + 툴팁 컨테이너 */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="w-full rounded-xl overflow-hidden"
          style={{ minHeight: 360 }}
        />

        {/* hover 툴팁 — DOM 직접 조작으로 렌더링 성능 최적화 */}
        <div
          ref={tooltipRef}
          style={{
            display: "none",
            position: "absolute",
            pointerEvents: "none",
            zIndex: 10,
            padding: "10px 14px",
            fontSize: "12px",
            minWidth: "175px",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            color: "#e2e8f0",
          }}
        />
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#22c55e" }} />
          캔들
        </span>
        {visibleMAs.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-5 h-[2px] rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        {showBollinger && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="inline-block w-5"
              style={{
                height: "1px",
                backgroundImage:
                  "repeating-linear-gradient(to right,#22d3ee 0,#22d3ee 4px,transparent 4px,transparent 7px)",
              }}
            />
            볼린저 밴드
          </span>
        )}
      </div>
    </div>
  );
}
