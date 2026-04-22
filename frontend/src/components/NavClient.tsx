"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const allLinks = [
    ...PUBLIC_NAV_LINKS,
    ...(session ? AUTH_NAV_LINKS : []),
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [mobileOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      {/* 데스크톱 네비 링크 (기존 유지) */}
      <div className="hidden sm:flex items-center gap-1 text-sm">
        {allLinks.map(({ href, label }) => {
          const active = isActive(href);
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
            className="hidden sm:inline-block px-3 py-1.5 text-xs text-slate-400 border border-white/10 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* 모바일 햄버거 버튼 */}
      <button
        type="button"
        aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
        className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
      >
        {mobileOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* 모바일 드로어 오버레이 */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 top-16 z-40 bg-slate-950 border-t border-white/10 before:absolute before:inset-x-0 before:top-0 before:h-12 before:bg-gradient-to-b before:from-purple-500/10 before:to-transparent before:pointer-events-none"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="flex flex-col p-4 gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {allLinks.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    active
                      ? "text-white bg-white/10"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            {session && (
              <>
                <div className="h-px bg-white/10 my-2" />
                <div className="px-4 py-2 text-xs text-slate-500 truncate">
                  {session.user?.name ?? session.user?.email}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-4 py-3 rounded-xl text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 text-left"
                >
                  로그아웃
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
