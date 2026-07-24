"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFollowedGames } from "@/lib/follow";

// スマホ幅用の上部タブ。Home + フォロー中のゲームだけを出す。
// フォローの追加・解除は Home 画面(またはデスクトップのサイドバー)の⭐で行う。

export default function GameTabs() {
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
