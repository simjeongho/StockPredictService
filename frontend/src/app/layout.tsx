import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "StockAI",
  description: "AI 기반 주가 기술적 분석 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-50 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
