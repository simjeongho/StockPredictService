"use client";

import type { BuyScore } from "@/types";
import { getScoreColor, getScoreLabel } from "@/types";

interface ScoreGaugeProps {
  score: BuyScore;
}

function ArcGauge({
  term,
  score,
  label,
}: {
  term: string;
  score: number;
  label: string;
}) {
  const color = getScoreColor(score);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const fillLength = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-slate-400 tracking-wide">{term}</p>
      <div className="relative" style={{ width: 116, height: 116 }}>
        <svg width="116" height="116" viewBox="0 0 116 116" className="-rotate-90">
          {/* 배경 트랙 */}
          <circle
            cx="58" cy="58" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* 점수 아크 */}
          <circle
            cx="58" cy="58" r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${circumference - fillLength}`}
            style={{
              filter: `drop-shadow(0 0 8px ${color}90)`,
              transition: "stroke-dasharray 0.8s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="text-[10px] text-slate-600 font-medium">/ 100</span>
        </div>
      </div>
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full border"
        style={{
          borderColor: `${color}40`,
          backgroundColor: `${color}18`,
          color,
        }}
      >
        {label || getScoreLabel(score)}
      </span>
    </div>
  );
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const avg = Math.round(
    (score.short_term.score + score.mid_term.score + score.long_term.score) / 3
  );
  const avgColor = getScoreColor(avg);
  const avgLabel = getScoreLabel(avg);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden">
      {/* 종합 점수 헤더 */}
      <div
        className="px-6 py-5 text-center"
        style={{
          background: `linear-gradient(135deg, ${avgColor}18 0%, transparent 60%)`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">AI 종합 투자 점수</p>
        <div className="flex items-end justify-center gap-1.5">
          <span className="text-5xl font-extrabold tabular-nums" style={{ color: avgColor }}>
            {avg}
          </span>
          <span className="text-slate-500 text-base mb-1.5">/ 100</span>
        </div>
        <span
          className="inline-block mt-2 text-sm font-semibold px-4 py-1 rounded-full border"
          style={{
            borderColor: `${avgColor}50`,
            backgroundColor: `${avgColor}20`,
            color: avgColor,
          }}
        >
          {avgLabel}
        </span>
      </div>

      {/* 기간별 게이지 */}
      <div className="flex justify-around px-4 py-6 bg-white/[0.02]">
        <ArcGauge term="단기 (1주)" score={score.short_term.score} label={score.short_term.label} />
        <div className="w-px bg-white/5" />
        <ArcGauge term="중기 (3개월)" score={score.mid_term.score} label={score.mid_term.label} />
        <div className="w-px bg-white/5" />
        <ArcGauge term="장기 (1년)" score={score.long_term.score} label={score.long_term.label} />
      </div>

      {/* 점수 기준 범례 */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {[
            { range: "0-20", label: "강력 매도", color: "#EF4444" },
            { range: "21-40", label: "매도 고려", color: "#F97316" },
            { range: "41-60", label: "중립", color: "#EAB308" },
            { range: "61-80", label: "매수 고려", color: "#84CC16" },
            { range: "81-100", label: "강력 매수", color: "#22C55E" },
          ].map(({ range, label, color }) => (
            <span key={range} className="flex items-center gap-1 text-[10px] text-slate-600 px-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {range} {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
