"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import ScoreTable from "@/components/ScoreTable";
import Disclaimer from "@/components/Disclaimer";
import GradientButton from "@/components/GradientButton";
import { getScoreRanking } from "@/services/api";
import type { ScoreRankingItem } from "@/types";

export default function ScoresPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ScoreRankingItem[]>([]);
  const [sortBy, setSortBy] = useState<"short" | "mid" | "long" | "total">("short");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState("");

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  const loadRanking = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getScoreRanking(token, true, sortBy);
      setItems(res.items);
      setDisclaimer(res.disclaimer);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e?.response?.data?.message) {
        setError(e.response.data.message);
      } else {
        setError("점수 데이터를 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, sortBy]);

  useEffect(() => {
    if (session) {
      loadRanking();
    }
  }, [session, loadRanking]);

  if (status === "loading") {
    return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📊</span>
        </div>
        <p className="text-slate-300 font-medium mb-2">로그인이 필요합니다</p>
        <p className="text-slate-500 text-sm mb-2">관심 종목을 등록하고 AI 분석을 실행하면 점수를 비교할 수 있습니다.</p>
        <p className="text-slate-600 text-xs mb-8">예측 점수 비교 기능은 로그인 후 이용 가능합니다.</p>
        <div className="flex justify-center gap-3">
          <GradientButton onClick={() => signIn("google")} size="md">
            Google로 로그인
          </GradientButton>
          <button
            onClick={() => signIn("kakao")}
            className="px-6 py-3 bg-[#FEE500] hover:bg-[#FFD700] text-slate-900 font-semibold rounded-xl hover:scale-[1.02] transition-all duration-300"
          >
            카카오로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">예측 점수 비교</h1>
          <p className="text-sm text-slate-400 mt-1">
            관심 종목의 AI 예측 점수를 한눈에 비교합니다.
          </p>
        </div>
        <button
          onClick={loadRanking}
          disabled={loading}
          className="px-4 py-2 text-sm bg-white/5 text-slate-300 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {/* 점수 설명 카드 */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">점수 기준 안내</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {[
            { label: "단기 (1주)", desc: "1주일 이내 단기 가격 움직임 전망" },
            { label: "중기 (3개월)", desc: "3개월 중기 추세 및 모멘텀 분석" },
            { label: "장기 (1년)", desc: "1년 장기 펀더멘털 및 성장성 평가" },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <p className="text-xs font-medium text-slate-300 mb-1">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { range: "0–20", label: "강력 매도", color: "#EF4444" },
            { range: "21–40", label: "매도 고려", color: "#F97316" },
            { range: "41–60", label: "중립", color: "#EAB308" },
            { range: "61–80", label: "매수 고려", color: "#84CC16" },
            { range: "81–100", label: "강력 매수", color: "#22C55E" },
          ].map(({ range, label, color }) => (
            <span
              key={label}
              className="text-xs px-2.5 py-1 rounded-full font-medium border"
              style={{ color, backgroundColor: color + "20", borderColor: color + "40" }}
            >
              {range} {label}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        {loading ? (
          <div className="py-12 text-center text-slate-500">점수 데이터 로딩 중...</div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 mb-2">{error}</p>
            <a href="/watchlist" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              관심 종목 관리하기
            </a>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="mb-2 text-slate-400">분석된 관심 종목이 없습니다.</p>
            <p className="text-sm text-slate-600 mb-4">
              종목 상세 화면에서 AI 분석을 먼저 실행해 주세요.
            </p>
            <a href="/dashboard" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              대시보드로 이동하기
            </a>
          </div>
        ) : (
          <ScoreTable
            items={items}
            sortBy={sortBy}
            onSortChange={(s) => setSortBy(s)}
          />
        )}
      </div>

      {disclaimer && (
        <div className="bg-amber-950/30 border border-amber-400/20 rounded-xl p-3">
          <p className="text-sm text-amber-300">⚠️ {disclaimer}</p>
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
