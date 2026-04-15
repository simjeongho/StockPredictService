"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import WatchlistCard from "@/components/WatchlistCard";
import { getWatchlist, removeWatchlist, deleteMe } from "@/services/api";
import type { WatchlistItem } from "@/types";

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    if (session && token) {
      setLoading(true);
      getWatchlist(token)
        .then((res) => setItems(res.items))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, token]);

  const handleRemove = async (ticker: string) => {
    try {
      await removeWatchlist(token, ticker);
      setItems((prev) => prev.filter((i) => i.ticker !== ticker));
    } catch {
      alert("삭제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMe(token);
      // 탈퇴 완료 후 로그아웃 + 메인으로 이동
      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/" });
    } catch {
      alert("회원 탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // 비로그인 상태
  if (status === "loading") {
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">관심 종목 기능을 사용하려면 로그인이 필요합니다.</p>
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
        <h1 className="text-2xl font-bold">관심 종목</h1>
        <span className="text-sm text-gray-500">{items.length} / 30개</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>등록된 관심 종목이 없습니다.</p>
          <a href="/" className="text-blue-600 hover:underline text-sm mt-2 block">
            종목 검색하러 가기
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <WatchlistCard
              key={`${item.ticker}-${item.market}`}
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* 회원 탈퇴 버튼 (FR-020) */}
      <div className="pt-8 border-t border-gray-200">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm text-red-500 hover:text-red-700 underline"
        >
          회원 탈퇴
        </button>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold mb-2">회원 탈퇴</h2>
            <p className="text-sm text-gray-600 mb-6">
              탈퇴하면 관심 종목이 모두 삭제됩니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "처리 중..." : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
