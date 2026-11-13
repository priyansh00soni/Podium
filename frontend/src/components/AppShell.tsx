"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  user?: {
    name: string;
    email?: string;
    role?: string;
  } | null;
  slug?: string;
  className?: string;
}

export function AppShell({
  children,
  breadcrumbs = [],
  user,
  slug,
  className = "",
}: AppShellProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    if (slug) {
      try {
        await logout(slug);
      } catch {
        // Fallback
      }
    }
    window.location.reload();
  };

  const isProblems = slug ? pathname === `/c/${slug}` : false;
  const isLeaderboard = slug ? pathname === `/c/${slug}/leaderboard` : false;
  const isSubmissions = slug ? pathname === `/c/${slug}/submissions` : false;
  const isAdmin = slug ? pathname.startsWith(`/c/${slug}/admin`) : false;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex flex-col antialiased">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full h-[52px] bg-[#0a0a0b]/90 backdrop-blur-md border-b border-[#26262b]">
        <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-4">
          {/* Left: Brand + Breadcrumbs */}
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-5 h-5 rounded-md bg-[#6D4AFF] flex items-center justify-center text-white text-[11px] font-bold group-hover:opacity-90 transition-opacity">
                P
              </div>
              <span className="font-semibold text-[#ededf0] group-hover:text-white transition-colors tracking-tight text-[15px]">
                Podium
              </span>
            </Link>

            <span className="text-[#3f3f46] select-none">/</span>
            <Link
              href="/contests"
              className="text-[#8b8b94] hover:text-[#ededf0] transition-colors truncate"
            >
              Contests
            </Link>

            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                <span className="text-[#3f3f46] select-none">/</span>
                {bc.href ? (
                  <Link
                    href={bc.href}
                    className="text-[#8b8b94] hover:text-[#ededf0] transition-colors truncate max-w-[200px] sm:max-w-xs"
                  >
                    {bc.label}
                  </Link>
                ) : (
                  <span className="text-[#ededf0] font-medium truncate max-w-[200px] sm:max-w-xs">
                    {bc.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Center / Navigation Tabs for Active Contest */}
          {slug && (
            <nav className="hidden md:flex items-center h-full gap-1 text-xs font-medium">
              <Link
                href={`/c/${encodeURIComponent(slug)}`}
                className={`h-full flex items-center px-3 transition-colors border-b-2 ${
                  isProblems
                    ? "border-[#6D4AFF] text-white font-semibold"
                    : "border-transparent text-[#8b8b94] hover:text-[#ededf0]"
                }`}
              >
                Problems
              </Link>
              <Link
                href={`/c/${encodeURIComponent(slug)}/leaderboard`}
                className={`h-full flex items-center px-3 transition-colors border-b-2 ${
                  isLeaderboard
                    ? "border-[#6D4AFF] text-white font-semibold"
                    : "border-transparent text-[#8b8b94] hover:text-[#ededf0]"
                }`}
              >
                Leaderboard
              </Link>
              <Link
                href={`/c/${encodeURIComponent(slug)}/submissions`}
                className={`h-full flex items-center px-3 transition-colors border-b-2 ${
                  isSubmissions
                    ? "border-[#6D4AFF] text-white font-semibold"
                    : "border-transparent text-[#8b8b94] hover:text-[#ededf0]"
                }`}
              >
                My Submissions
              </Link>
              <Link
                href={`/c/${encodeURIComponent(slug)}/admin/problems`}
                className={`h-full flex items-center px-3 transition-colors border-b-2 ${
                  isAdmin
                    ? "border-[#6D4AFF] text-white font-semibold"
                    : "border-transparent text-[#8b8b94] hover:text-[#ededf0]"
                }`}
              >
                Staff
              </Link>
            </nav>
          )}

          {/* Right: User / Auth actions */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2.5 text-xs">
                {/* User Avatar Circle */}
                <div
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6D4AFF] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/10 shrink-0 select-none shadow-sm"
                  title={user.email || user.name}
                >
                  {(user.name?.[0] || user.email?.[0] || "P").toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight min-w-0">
                  <span className="font-medium text-[#ededf0] truncate max-w-[160px]">
                    {user.email || user.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#8b8b94] uppercase tracking-wider">
                    {user.role || "Participant"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2 py-1 rounded text-xs text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a] transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 ${className}`}>
        {children}
      </main>
    </div>
  );
}
