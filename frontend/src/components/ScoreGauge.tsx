"use client";

import type { BuyScore } from "@/types";
import { getScoreColor, getScoreLabel } from "@/types";

interface ScoreGaugeProps {
  score: BuyScore;
}

function SingleGauge({
  term,
  score,
  label,
}: {
  term: string;
  score: number;
  label: string;
}) {
  const color = getScoreColor(score);
  const pct = score;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-gray-500">{term}</p>
      {/* 원형 게이지 */}
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {label || getScoreLabel(score)}
      </span>
    </div>
  );
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  return (
    <div className="flex justify-around p-4 bg-gray-50 rounded-lg">
      <SingleGauge
        term="단기 (1주)"
        score={score.short_term.score}
        label={score.short_term.label}
      />
      <SingleGauge
        term="중기 (3개월)"
        score={score.mid_term.score}
        label={score.mid_term.label}
      />
      <SingleGauge
        term="장기 (1년)"
        score={score.long_term.score}
        label={score.long_term.label}
      />
    </div>
  );
}
