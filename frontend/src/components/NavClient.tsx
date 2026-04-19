"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const PUBLIC_NAV_LINKS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/market-issues", label: "시장 이슈" },
  { href: "/scores", label: "점수 비교" },
  { href: "/comparison", label: "비교 분석" },
];

const AUTH_NAV_LINKS = [
  { href: "/watchlist", label: "관심 종목" },
  { href: "/history", label: "분석 기록" },
  { href: "/chat", label: "AI 챗봇" },
];

export default function NavClient() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const allLinks = [
    ...PUBLIC_NAV_LINKS,
    ...(session ? AUTH_NAV_LINKS : []),
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      {/* 네비 링크 */}
      <div className="hidden sm:flex items-center gap-1 text-sm">
        {allLinks.map(({ href, label }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                active
                  ? "text-white bg-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* 사용자 상태 — 로그인된 경우만 표시 */}
      {session && (
        <div className="flex items-center gap-2 ml-2">
          <span className="hidden sm:block text-xs text-slate-400 max-w-[120px] truncate">
            {session.user?.name ?? session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-3 py-1.5 text-xs text-slate-400 border border-white/10 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
