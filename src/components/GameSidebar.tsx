"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useFollowedGames, useFollowedTeams } from "@/lib/follow";
import type { GameCategory, GameConfig } from "@/lib/games";

// デスクトップ用の左サイドバー。FotMobの「トップリーグ / すべてのリーグ」に
// 倣い、セクションごとに独立したカードで区切る: 移動 → フォロー中 → 人気ゲーム
// (常時表示)→ その他(ジャンル別・折りたたみ+検索)→ フォロー中チーム。
// ⭐でフォロー切替。フォローすると上のカードに移動する。

const CATEGORY_ORDER: GameCategory[] = [
  "FPS",
  "MOBA",
  "Battle Royale",
  "Fighting",
  "Racing & Sports",
  "Strategy",
  "Other",
];

function GameLogo({ game }: { game: GameConfig }) {
  if (game.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 自前ホストのロゴ画像(public/game-logos)
      <img
        src={game.logo}
        alt=""
        className="logo-chip h-6 w-6 shrink-0 object-contain"
      />
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-bold"
      style={{ backgroundColor: `${game.accent}22`, color: game.accent }}
    >
      {game.short}
    </span>
  );
}

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
        <GameLogo game={game} />
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-2">
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </p>
  );
}

export default function GameSidebar() {
  const pathname = usePathname();
  const { ready, followed, others, toggleFollow, showOthers, setShowOthers } =
    useFollowedGames();
  const { teams, toggleTeamFollow } = useFollowedTeams();
  const [filter, setFilter] = useState("");

  const popular = useMemo(() => others.filter((g) => g.popular), [others]);
  const rest = useMemo(() => others.filter((g) => !g.popular), [others]);
  const filteredRest = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? rest.filter((g) => g.name.toLowerCase().includes(q)) : rest;
  }, [rest, filter]);
  const byCategory = useMemo(() => {
    const map = new Map<GameCategory, GameConfig[]>();
    for (const g of filteredRest) {
      const list = map.get(g.category) ?? [];
      list.push(g);
      map.set(g.category, list);
    }
    return map;
  }, [filteredRest]);

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
    <nav className="sticky top-20 flex flex-col gap-3">
      <Card>
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
      </Card>

      <Card>
        <CardLabel>Following</CardLabel>
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
      </Card>

      {popular.length > 0 && (
        <Card>
          <CardLabel>Popular Games</CardLabel>
          {popular.map((game) => (
            <GameRow
              key={game.slug}
              game={game}
              active={isActive(game.slug)}
              followed={false}
              onToggle={() => toggleFollow(game.slug)}
            />
          ))}
        </Card>
      )}

      {rest.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={() => setShowOthers(!showOthers)}
            className="flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            All games ({rest.length})
            <span>{showOthers ? "▾" : "▸"}</span>
          </button>
          {showOthers && (
            <>
              <div className="px-2 pb-1 pt-1">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search games…"
                  className="w-full rounded-lg border border-border-subtle bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              {filteredRest.length === 0 ? (
                <p className="px-3 pb-2 text-xs text-muted">No games found</p>
              ) : (
                CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
                  <div key={c}>
                    <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
                      {c}
                    </p>
                    {byCategory.get(c)!.map((game) => (
                      <GameRow
                        key={game.slug}
                        game={game}
                        active={isActive(game.slug)}
                        followed={false}
                        onToggle={() => toggleFollow(game.slug)}
                      />
                    ))}
                  </div>
                ))
              )}
            </>
          )}
        </Card>
      )}

      {teams.length > 0 && (
        <Card>
          <CardLabel>Teams</CardLabel>
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
        </Card>
      )}
    </nav>
  );
}
