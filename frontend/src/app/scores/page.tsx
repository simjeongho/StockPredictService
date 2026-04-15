"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import ScoreTable from "@/components/ScoreTable";
import Disclaimer from "@/components/Disclaimer";
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
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-2">예측 점수 비교 기능을 사용하려면 로그인이 필요합니다.</p>
        <p className="text-sm text-gray-400 mb-6">관심 종목을 등록하고 AI 분석을 실행하면 점수를 비교할 수 있습니다.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => signIn("google")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Google로 로그인
          </button>
          <button
            onClick={() => signIn("kakao")}
            className="px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500"
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
          <h1 className="text-2xl font-bold">예측 점수 비교</h1>
          <p className="text-sm text-gray-500 mt-1">
            관심 종목의 AI 예측 점수를 한눈에 비교합니다.
          </p>
        </div>
        <button
          onClick={loadRanking}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <div className="py-12 text-center text-gray-400">점수 데이터 로딩 중...</div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 mb-2">{error}</p>
            <a
              href="/watchlist"
              className="text-sm text-blue-600 hover:underline"
            >
              관심 종목 관리하기
            </a>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p className="mb-2">분석된 관심 종목이 없습니다.</p>
            <p className="text-sm text-gray-400 mb-4">
              종목 상세 화면에서 AI 분석을 먼저 실행해 주세요.
            </p>
            <a
              href="/"
              className="text-sm text-blue-600 hover:underline"
            >
              종목 검색하러 가기
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">⚠️ {disclaimer}</p>
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
