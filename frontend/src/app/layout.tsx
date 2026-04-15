import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "주가 예측 앱",
  description: "AI 기반 주가 기술적 분석 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        {/* 네비게이션 바 */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="font-bold text-lg text-blue-600">
                📈 StockAI
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  홈
                </Link>
                <Link href="/watchlist" className="text-gray-600 hover:text-gray-900">
                  관심 종목
                </Link>
                <Link href="/scores" className="text-gray-600 hover:text-gray-900">
                  점수 비교
                </Link>
                <Link href="/chat" className="text-gray-600 hover:text-gray-900">
                  AI 챗봇
                </Link>
              </div>
            </div>
          </nav>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
