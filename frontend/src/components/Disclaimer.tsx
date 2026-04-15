"use client";

interface DisclaimerProps {
  variant?: "default" | "compact";
}

// 표준 면책 고지 문구 (contracts/ai.md 기준)
export const DISCLAIMER_TEXT =
  "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.";

export default function Disclaimer({ variant = "default" }: DisclaimerProps) {
  if (variant === "compact") {
    return (
      <p className="text-xs text-gray-400 mt-2">⚠️ {DISCLAIMER_TEXT}</p>
    );
  }

  return (
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800">
        <span className="font-semibold">⚠️ 투자 유의사항</span>
        <br />
        {DISCLAIMER_TEXT}
      </p>
    </div>
  );
}
