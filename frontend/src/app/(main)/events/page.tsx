"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";

interface GlobalEventItem {
  ticker: string;
  market: string;
  summary: string;
  analyzed_at: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<GlobalEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GlobalEventItem[]>("/api/v1/stocks/market/events")
      .then((res) => setEvents(res.data))
      .catch(() => setError("글로벌 이벤트 데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">글로벌 이벤트 요약</h1>
        <p className="text-sm text-gray-500 mt-1">
          최근 AI 분석에서 추출된 주요 글로벌 이벤트 요약입니다.
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">이벤트 데이터 로딩 중...</div>
      )}

      {error && (
        <div className="text-center py-12 text-gray-500">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>아직 분석된 이벤트 데이터가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            종목 상세 화면에서 AI 분석을 실행하면 글로벌 이벤트가 추출됩니다.
          </p>
          <a href="/" className="text-sm text-blue-600 hover:underline mt-2 block">
            종목 검색하러 가기
          </a>
        </div>
      )}

      <div className="space-y-3">
        {events.map((ev, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <a
                  href={`/stock/${ev.ticker}?market=${ev.market}`}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {ev.ticker}
                </a>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {ev.market.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-400">{timeAgo(ev.analyzed_at)}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ev.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
