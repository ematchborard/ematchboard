"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFollowedGames, useFollowedTeams } from "@/lib/follow";
import type { GameConfig } from "@/lib/games";

// デスクトップ用の左サイドバー。フォロー中のゲームを上に、
// その他のゲームは開閉式のセクションに隠し、その下にフォロー中チームを並べる。
// ⭐でフォロー切替。

function GameRow({
  game,
  active,
  followed,
  onToggle,
}: {
  game: GameConfig;
  active: boolean;
  followed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`group flex items-center rounded-lg transition-colors ${
        active ? "bg-surface-hover" : "hover:bg-surface-hover"
      }`}
    >
      <Link
        href={`/${game.slug}`}
        className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium ${
          active ? "" : "text-muted group-hover:text-foreground"
        }`}
        style={active ? { color: game.accent } : undefined}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-bold"
          style={{ backgroundColor: `${game.accent}22`, color: game.accent }}
        >
          {game.short}
        </span>
        <span className="truncate">{game.name}</span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-label={followed ? `Unfollow ${game.name}` : `Follow ${game.name}`}
        title={followed ? "フォロー解除" : "フォローする"}
        className={`shrink-0 px-2.5 py-2 text-sm transition-colors ${
          followed
            ? "text-amber-400 hover:text-muted"
            : "text-muted/40 hover:text-amber-400"
        }`}
      >
        {followed ? "★" : "☆"}
      </button>
    </div>
  );
}

export default function GameSidebar() {
  const pathname = usePathname();
  const { ready, followed, others, toggleFollow, showOthers, setShowOthers } =
    useFollowedGames();
  const { teams, toggleTeamFollow } = useFollowedTeams();

  if (!ready) {
    return (
      <div
        aria-hidden
        className="sticky top-20 h-64 animate-pulse rounded-xl border border-border-subtle bg-surface"
      />
    );
  }

  const isActive = (slug: string) =>
    pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);

  return (
    <nav className="sticky top-20 rounded-xl border border-border-subtle bg-surface p-2">
      <Link
        href="/"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          pathname === "/"
            ? "bg-surface-hover text-brand"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/15 text-[10px] font-bold text-brand">
          ⌂
        </span>
        Home
      </Link>
      <Link
        href="/ewc"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive("ewc")
            ? "bg-surface-hover text-amber-400"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-[10px] font-bold text-amber-400">
          🏆
        </span>
        Esports World Cup
      </Link>

      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Following
      </p>
      {followed.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-muted">
          ☆を押してゲームをフォロー
        </p>
      ) : (
        followed.map((game) => (
          <GameRow
            key={game.slug}
            game={game}
            active={isActive(game.slug)}
            followed
            onToggle={() => toggleFollow(game.slug)}
          />
        ))
      )}

      {others.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowOthers(!showOthers)}
            className="flex w-full items-center justify-between px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            Other games ({others.length})
            <span>{showOthers ? "▾" : "▸"}</span>
          </button>
          {showOthers &&
            others.map((game) => (
              <GameRow
                key={game.slug}
                game={game}
                active={isActive(game.slug)}
                followed={false}
                onToggle={() => toggleFollow(game.slug)}
              />
            ))}
        </>
      )}

      {teams.length > 0 && (
        <>
          <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Teams
          </p>
          {teams.map((team) => {
            const href = `/${team.game}/team/${team.id}`;
            const active = pathname === href;
            return (
              <div
                key={team.id}
                className={`group flex items-center rounded-lg transition-colors ${
                  active ? "bg-surface-hover" : "hover:bg-surface-hover"
                }`}
              >
                <Link
                  href={href}
                  className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm font-medium ${
                    active ? "" : "text-muted group-hover:text-foreground"
                  }`}
                >
                  {team.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
                    <img
                      src={team.image_url}
                      alt=""
                      className="logo-chip h-6 w-6 shrink-0 object-contain"
                    />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted">
                      {(team.acronym ?? team.name).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">{team.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleTeamFollow(team)}
                  aria-label={`Unfollow ${team.name}`}
                  title="フォロー解除"
                  className="shrink-0 px-2.5 py-2 text-sm text-amber-400 transition-colors hover:text-muted"
                >
                  ★
                </button>
              </div>
            );
          })}
        </>
      )}
    </nav>
  );
}
