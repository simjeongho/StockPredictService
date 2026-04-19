"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  deleted_at: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    api
      .get("/api/v1/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUsers(res.data))
      .catch(() => setError("관리자 권한이 없거나 불러오기에 실패했습니다."))
      .finally(() => setLoading(false));
  }, [status, token]);

  const banUser = async (userId: string, isBanning: boolean) => {
    setActionLoading(userId);
    try {
      const endpoint = isBanning
        ? `/api/v1/admin/users/${userId}/ban`
        : `/api/v1/admin/users/${userId}/unban`;
      await api.post(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !isBanning } : u))
      );
    } catch {
      alert("작업에 실패했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center">
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-50">관리자 대시보드</h1>
        <p className="text-slate-400 text-sm mt-1">전체 사용자 관리</p>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-3.5 text-slate-500 font-medium">이메일</th>
              <th className="text-left px-4 py-3.5 text-slate-500 font-medium">이름</th>
              <th className="text-left px-4 py-3.5 text-slate-500 font-medium">로그인</th>
              <th className="text-left px-4 py-3.5 text-slate-500 font-medium">상태</th>
              <th className="text-right px-6 py-3.5 text-slate-500 font-medium">가입일</th>
              <th className="px-4 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-slate-200">{u.email}</td>
                <td className="px-4 py-4 text-slate-300">{u.name}</td>
                <td className="px-4 py-4 text-slate-500 capitalize">{u.provider}</td>
                <td className="px-4 py-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.deleted_at
                        ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        : u.is_active
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {u.deleted_at ? "탈퇴" : u.is_active ? "활성" : "정지"}
                  </span>
                  {u.is_admin && (
                    <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 font-medium">
                      관리자
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-slate-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-4">
                  {!u.is_admin && !u.deleted_at && (
                    <button
                      onClick={() => banUser(u.id, u.is_active)}
                      disabled={actionLoading === u.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                        u.is_active
                          ? "text-rose-400 border border-rose-500/30 hover:bg-rose-500/10"
                          : "text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10"
                      }`}
                    >
                      {actionLoading === u.id ? "처리 중..." : u.is_active ? "정지" : "복구"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
