"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFollowedGames } from "@/lib/follow";
import type { RunningSerie } from "@/lib/featured";

// スマホ幅用の上部タブ。Home + 開催中の大会(赤ドット付き) + フォロー中の
// ゲームを出す。フォローの追加・解除は Home 画面(またはデスクトップの
// サイドバー)の⭐で行う。

export default function GameTabs({
  runningSeries = [],
}: {
  runningSeries?: RunningSerie[];
}) {
  const pathname = usePathname();
  const { ready, followed } = useFollowedGames();

  return (
    <nav className="mt-3 flex gap-5 overflow-x-auto">
      <Link
        href="/"
        className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
          pathname === "/"
            ? "border-brand text-brand"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        Home
      </Link>
      {runningSeries.slice(0, 3).map((s) => (
        <Link
          key={s.key}
          href={s.url}
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
            pathname === s.url
              ? "text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          style={pathname === s.url ? { borderColor: s.accent } : undefined}
        >
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-live" aria-hidden />
          {s.leagueName}
        </Link>
      ))}
      <Link
        href="/ewc"
        className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
          pathname === "/ewc" || pathname.startsWith("/ewc/")
            ? "border-amber-400 text-amber-400"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        🏆 EWC
      </Link>
      {ready &&
        followed.map((game) => {
          const active =
            pathname === `/${game.slug}` ||
            pathname.startsWith(`/${game.slug}/`);
          return (
            <Link
              key={game.slug}
              href={`/${game.slug}`}
              className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
                active
                  ? ""
                  : "border-transparent text-muted hover:text-foreground"
              }`}
              style={
                active
                  ? { borderColor: game.accent, color: game.accent }
                  : undefined
              }
            >
              {game.name}
            </Link>
          );
        })}
    </nav>
  );
}
