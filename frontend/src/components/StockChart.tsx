"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import type { Candle } from "@/types";

export type CandleType = "daily" | "weekly" | "monthly";

type DrawingMode = "off" | "trendline" | "hline";

interface TrendLineData {
  kind: "trendline";
  id: string;
  p1: { time: string; price: number };
  p2: { time: string; price: number };
}

interface HLineData {
  kind: "hline";
  id: string;
  price: number;
}

type DrawingLine = TrendLineData | HLineData;

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

function computeSMA(candles: Candle[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    result.push({ time: candles[i].time, value: sum / period });
  }
  return result;
}

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

const CHART_HEIGHT = 360;

function storageKey(ticker: string, market: string) {
  return `chart_drawings_${ticker.toUpperCase()}_${market}`;
}

function loadLines(ticker: string, market: string): DrawingLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(ticker, market));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLines(ticker: string, market: string, lines: DrawingLine[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(ticker, market), JSON.stringify(lines));
  } catch {
    // storage full or disabled
  }
}

export default function StockChart({ candles, ticker, market = "us", candleType = "daily" }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLinesRef = useRef<Map<string, any>>(new Map());

  const [drawingMode, setDrawingMode] = useState<DrawingMode>("off");
  const [pendingPoint, setPendingPoint] = useState<{ time: string; price: number; x: number; y: number } | null>(null);
  const [lines, setLines] = useState<DrawingLine[]>(() => loadLines(ticker, market));
  const [renderTick, setRenderTick] = useState(0);
  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; price: number } | null>(null);

  const displayCandles = useMemo(() => aggregateCandles(candles, candleType), [candles, candleType]);

  useEffect(() => {
    setLines(loadLines(ticker, market));
    setPendingPoint(null);
  }, [ticker, market]);

  useEffect(() => {
    saveLines(ticker, market, lines);
  }, [ticker, market, lines]);

  useEffect(() => {
    if (!chartContainerRef.current || displayCandles.length === 0) return;

    let unmounted = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;

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

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        setRenderTick((n) => n + 1);
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
        height: CHART_HEIGHT,
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
      chartRef.current = chart;

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
      candleSeriesRef.current = candleSeries;

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

      if (displayCandles.length >= 20) {
        const bbUpperSeries = chart.addLineSeries({
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

        const bbLowerSeries = chart.addLineSeries({
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

      // 저장된 선 복원 → SVG 재렌더 트리거
      setRenderTick((n) => n + 1);

      // 시간 범위 변동 시 재렌더
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        setRenderTick((n) => n + 1);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.subscribeCrosshairMove((param: any) => {
        const tip = tooltipRef.current;
        const container = chartContainerRef.current;
        if (!tip || !container) return;

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

        const candle = param.seriesData.get(candleSeries);
        if (!candle || candle.open === undefined) {
          tip.style.display = "none";
          return;
        }

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
      priceLinesRef.current.clear();
      chart?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [displayCandles, ticker, market]);

  // 수평선(price lines) 동기화 — lightweight-charts의 createPriceLine 사용
  useEffect(() => {
    const cs = candleSeriesRef.current;
    if (!cs) return;
    const current = priceLinesRef.current;
    const nextIds = new Set(lines.filter((l) => l.kind === "hline").map((l) => l.id));

    // 제거된 선 삭제
    for (const [id, pl] of Array.from(current.entries())) {
      if (!nextIds.has(id)) {
        try { cs.removePriceLine(pl); } catch { /* noop */ }
        current.delete(id);
      }
    }
    // 신규 선 추가
    for (const l of lines) {
      if (l.kind !== "hline" || current.has(l.id)) continue;
      try {
        const pl = cs.createPriceLine({
          price: l.price,
          color: "#f97316",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "",
        });
        current.set(l.id, pl);
      } catch { /* noop */ }
    }
  }, [lines, renderTick]);

  // 그린 선(추세선·수평선) 위 hover/터치 시 가격 툴팁
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const HITBOX_PX = 8;

    const computeHit = (x: number, y: number): { x: number; y: number; price: number } | null => {
      const cs = candleSeriesRef.current;
      if (!cs) return null;

      // 추세선: 픽셀 선형 보간
      for (const l of lines) {
        if (l.kind !== "trendline") continue;
        const chart = chartRef.current;
        if (!chart) continue;
        const x1 = chart.timeScale().timeToCoordinate(l.p1.time as `${number}-${number}-${number}`);
        const x2 = chart.timeScale().timeToCoordinate(l.p2.time as `${number}-${number}-${number}`);
        const y1 = cs.priceToCoordinate(l.p1.price);
        const y2 = cs.priceToCoordinate(l.p2.price);
        if (x1 == null || x2 == null || y1 == null || y2 == null) continue;
        if (Math.abs(x2 - x1) < 1) continue;
        const xMin = Math.min(x1, x2);
        const xMax = Math.max(x1, x2);
        if (x < xMin - HITBOX_PX || x > xMax + HITBOX_PX) continue;
        const clampedX = Math.max(Math.min(x, xMax), xMin);
        const t = (clampedX - x1) / (x2 - x1);
        const yAtX = y1 + t * (y2 - y1);
        if (Math.abs(y - yAtX) > HITBOX_PX) continue;
        const price = cs.coordinateToPrice(yAtX);
        if (price == null) continue;
        return { x: clampedX, y: yAtX, price: Number(price) };
      }

      // 수평선: 고정 가격, y좌표는 priceToCoordinate
      for (const l of lines) {
        if (l.kind !== "hline") continue;
        const yLine = cs.priceToCoordinate(l.price);
        if (yLine == null) continue;
        if (Math.abs(y - yLine) > HITBOX_PX) continue;
        return { x, y: yLine, price: l.price };
      }

      return null;
    };

    const handleMove = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        setHoverTooltip(null);
        return;
      }
      setHoverTooltip(computeHit(x, y));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => setHoverTooltip(null);
    const onMouseLeave = () => setHoverTooltip(null);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    container.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [lines, renderTick]);

  // 추세선 → SVG 좌표 변환
  const trendlineSegments = useMemo(() => {
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return [];
    type Seg = { id: string; x1: number; y1: number; x2: number; y2: number };
    const segs: Seg[] = [];
    for (const l of lines) {
      if (l.kind !== "trendline") continue;
      const x1 = chart.timeScale().timeToCoordinate(l.p1.time as `${number}-${number}-${number}`);
      const x2 = chart.timeScale().timeToCoordinate(l.p2.time as `${number}-${number}-${number}`);
      const y1 = cs.priceToCoordinate(l.p1.price);
      const y2 = cs.priceToCoordinate(l.p2.price);
      if (x1 != null && x2 != null && y1 != null && y2 != null) {
        segs.push({ id: l.id, x1, y1, x2, y2 });
      }
    }
    return segs;
  }, [lines, renderTick, displayCandles]);

  const handleChartClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (drawingMode === "off") return;
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    const container = chartContainerRef.current;
    if (!chart || !cs || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = chart.timeScale().coordinateToTime(x);
    const price = cs.coordinateToPrice(y);
    if (time == null || price == null) return;

    const timeStr =
      typeof time === "string"
        ? time
        : typeof time === "number"
        ? new Date(time * 1000).toISOString().slice(0, 10)
        : String(time);

    if (drawingMode === "hline") {
      const newLine: HLineData = {
        kind: "hline",
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        price: Number(price),
      };
      setLines((prev) => [...prev, newLine]);
      return;
    }

    if (drawingMode === "trendline") {
      if (!pendingPoint) {
        setPendingPoint({ time: timeStr, price: Number(price), x, y });
      } else {
        const newLine: TrendLineData = {
          kind: "trendline",
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          p1: { time: pendingPoint.time, price: pendingPoint.price },
          p2: { time: timeStr, price: Number(price) },
        };
        setLines((prev) => [...prev, newLine]);
        setPendingPoint(null);
      }
    }
  }, [drawingMode, pendingPoint]);

  const clearAll = () => {
    setLines([]);
    setPendingPoint(null);
  };

  const setMode = (m: DrawingMode) => {
    setDrawingMode(m);
    setPendingPoint(null);
  };

  const visibleMAs = MA_CONFIGS.filter((m) => displayCandles.length >= m.period);
  const showBollinger = displayCandles.length >= 20;

  const svgInteractive = drawingMode !== "off";

  return (
    <div className="space-y-3">
      {/* 드로잉 툴바 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 mr-1">그리기:</span>
        <button
          onClick={() => setMode(drawingMode === "trendline" ? "off" : "trendline")}
          className={`px-2.5 py-1 rounded-lg border transition-colors ${
            drawingMode === "trendline"
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
          }`}
        >
          추세선
        </button>
        <button
          onClick={() => setMode(drawingMode === "hline" ? "off" : "hline")}
          className={`px-2.5 py-1 rounded-lg border transition-colors ${
            drawingMode === "hline"
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
          }`}
        >
          수평선
        </button>
        <button
          onClick={() => setMode("off")}
          className={`px-2.5 py-1 rounded-lg border transition-colors ${
            drawingMode === "off"
              ? "bg-white/10 text-slate-200 border-white/20"
              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
          }`}
        >
          OFF
        </button>
        <button
          onClick={clearAll}
          disabled={lines.length === 0}
          className="px-2.5 py-1 rounded-lg border bg-white/5 text-rose-400 border-rose-500/20 hover:bg-rose-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          전체 지우기 ({lines.filter((l) => l.kind !== "hline").length + priceLinesRef.current.size})
        </button>
        {drawingMode === "trendline" && (
          <span className="text-slate-500 ml-1">
            {pendingPoint ? "두 번째 점을 클릭하세요" : "첫 번째 점을 클릭하세요"}
          </span>
        )}
        {drawingMode === "hline" && <span className="text-slate-500 ml-1">차트를 클릭하면 수평선이 생성됩니다</span>}
      </div>

      {/* 차트 + 툴팁 + SVG 오버레이 컨테이너 */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="w-full rounded-xl overflow-hidden"
          style={{ minHeight: CHART_HEIGHT }}
        />

        {/* SVG 오버레이 — 추세선 렌더 + 클릭 캡처 */}
        <svg
          ref={svgRef}
          onClick={handleChartClick}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: svgInteractive ? "auto" : "none",
            cursor: svgInteractive ? "crosshair" : "default",
            zIndex: 5,
          }}
        >
          {trendlineSegments.map((s) => (
            <line
              key={s.id}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="0"
            />
          ))}
          {pendingPoint && (
            <circle cx={pendingPoint.x} cy={pendingPoint.y} r={4} fill="#a855f7" />
          )}
        </svg>

        {/* hover 툴팁 */}
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

        {/* 그린 선 위 가격 툴팁 (US-5) */}
        {hoverTooltip && (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded-md bg-slate-900/95 border border-purple-500/40 text-xs font-semibold text-purple-200 shadow-lg shadow-purple-500/20"
            style={{
              left: Math.max(4, Math.min(hoverTooltip.x + 10, (chartContainerRef.current?.clientWidth ?? 1000) - 80)),
              top: Math.max(4, hoverTooltip.y - 28),
              zIndex: 15,
            }}
          >
            {market === "kr"
              ? `₩${hoverTooltip.price.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`
              : `$${hoverTooltip.price.toFixed(2)}`}
          </div>
        )}
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
