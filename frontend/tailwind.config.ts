import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 예측 점수 색상 코딩
        score: {
          "strong-sell": "#EF4444",  // 0–20 강력 매도
          sell: "#F97316",           // 21–40 매도 고려
          neutral: "#EAB308",        // 41–60 중립
          buy: "#84CC16",            // 61–80 매수 고려
          "strong-buy": "#22C55E",   // 81–100 강력 매수
        },
      },
    },
  },
  plugins: [],
};

export default config;
