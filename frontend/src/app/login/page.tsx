"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* 배경 글로우 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* 로그인 카드 */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30 mb-4">
              <span className="text-3xl">📈</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              StockAI
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              AI 기반 주가 예측 및 투자 분석 서비스
            </p>
          </div>

          {/* 소개 */}
          <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/5">
            <p className="text-slate-300 text-sm text-center leading-relaxed">
              관심 종목의 AI 투자 점수와 기술적 분석을<br />
              한눈에 확인하세요.
            </p>
          </div>

          {/* OAuth 버튼 */}
          <div className="space-y-3">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 시작하기
            </button>

            <button
              onClick={() => signIn("kakao", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-slate-900 bg-[#FEE500] hover:bg-[#FFD700] shadow-lg hover:scale-[1.02] transition-all duration-300"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.657 1.694 4.985 4.23 6.326L5.13 21l5.08-2.73C10.72 18.42 11.35 18.5 12 18.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
              </svg>
              카카오로 시작하기
            </button>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6 leading-relaxed">
            본 서비스는 투자 참고 목적으로만 제공되며<br />
            투자 결과에 대한 책임은 사용자에게 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
