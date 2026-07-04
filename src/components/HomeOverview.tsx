"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DAY_MS, localDayStart, parseDateStr, toDateStr } from "@/lib/date";
import { useFollowedGames } from "@/lib/follow";
import type { GameConfig } from "@/lib/games";
import type { ViewMode } from "@/lib/range";
import type { Match } from "@/lib/types";
import DateNav from "./DateNav";
import MonthSummaryList from "./MonthSummaryList";
import PeriodNav from "./PeriodNav";
import TournamentGroups from "./TournamentGroups";

// 総合ホーム。フォロー中ゲームごとにダイジェストを縦に並べる。
// Day(カレンダー付き)/Week/Month をゲームページと同じ操作感で切り替えられる。
// その他のゲームはボタンで表示/非表示、⭐でフォロー管理。

function GameSection({
  game,
  followed,
  onToggle,
  children,
}: {
  game: GameConfig;
  followed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
          style={{ backgroundColor: `${game.accent}22`, color: game.accent }}
        >
          {game.short}
        </span>
        <Link
          href={`/${game.slug}`}
          className="truncate text-sm font-bold hover:underline"
        >
          {game.name}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={followed ? `Unfollow ${game.name}` : `Follow ${game.name}`}
          title={followed ? "フォロー解除" : "フォローする"}
          className={`shrink-0 text-sm transition-colors ${
            followed
              ? "text-amber-400 hover:text-muted"
              : "text-muted/40 hover:text-amber-400"
          }`}
        >
          {followed ? "★" : "☆"}
        </button>
        <Link
          href={`/${game.slug}`}
          className="ml-auto shrink-0 text-xs text-muted hover:text-foreground"
        >
          All matches ›
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-border-subtle bg-surface px-4 py-4 text-center text-xs text-muted">
      {text}
    </p>
  );
}

export default function HomeOverview({
  perGame,
  view,
  offset,
  selectedDate,
}: {
  perGame: { slug: string; matches: Match[] }[];
  view: ViewMode;
  offset: number;
  selectedDate: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const {
    ready,
    followed,
    others,
    isFollowed,
    toggleFollow,
    showOthers,
    setShowOthers,
  } = useFollowedGames();

  if (!mounted || !ready) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  const bySlug = new Map(perGame.map((p) => [p.slug, p.matches]));
  const todayStart = localDayStart(new Date());

  // ビューごとの期間ナビと、各ゲームのセクション本体の作り方を決める
  let nav: ReactNode;
  let renderBody: (game: GameConfig, matches: Match[]) => ReactNode;

  if (view === "week") {
    const dow = (new Date(todayStart).getDay() + 6) % 7; // 月曜=0
    const weekStart = todayStart - dow * DAY_MS + offset * 7 * DAY_MS;
    const weekEnd = weekStart + 7 * DAY_MS;
    const fmt = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });
    nav = (
      <PeriodNav
        prevHref={`/?view=week&o=${offset - 1}`}
        nextHref={`/?view=week&o=${offset + 1}`}
        label={`${fmt.format(weekStart)} – ${fmt.format(weekEnd - DAY_MS)}`}
        badge={offset === 0 ? "This week" : null}
      />
    );
    renderBody = (game, matches) => {
      const inWeek = matches.filter((m) => {
        if (!m.begin_at) return false;
        const t = localDayStart(new Date(m.begin_at));
        return t >= weekStart && t < weekEnd;
      });
      return inWeek.length === 0 ? (
        <EmptyNote text="No matches this week" />
      ) : (
        <TournamentGroups
          matches={inWeek}
          gameSlug={game.slug}
          maxGroups={3}
          maxMatchesPerGroup={4}
        />
      );
    };
  } else if (view === "month") {
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() + offset,
      1
    ).getTime();
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + offset + 1,
      1
    ).getTime();
    const label = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(monthStart);
    nav = (
      <PeriodNav
        prevHref={`/?view=month&o=${offset - 1}`}
        nextHref={`/?view=month&o=${offset + 1}`}
        label={label}
        badge={offset === 0 ? "This month" : null}
      />
    );
    renderBody = (game, matches) => (
      <MonthSummaryList
        matches={matches}
        gameSlug={game.slug}
        rangeStart={monthStart}
        rangeEnd={monthEnd}
        emptyText="No tournaments this month"
      />
    );
  } else {
    const effectiveDate = selectedDate ?? toDateStr(todayStart);
    const selStart = parseDateStr(effectiveDate) ?? todayStart;
    nav = <DateNav basePath="/" selectedDate={effectiveDate} />;
    renderBody = (game, matches) => {
      const onDay = matches.filter(
        (m) => m.begin_at && localDayStart(new Date(m.begin_at)) === selStart
      );
      return onDay.length === 0 ? (
        <EmptyNote text="No matches on this day" />
      ) : (
        <TournamentGroups
          matches={onDay}
          gameSlug={game.slug}
          maxGroups={2}
          maxMatchesPerGroup={4}
        />
      );
    };
  }

  return (
    <div className="flex flex-col gap-6">
      {nav}

      {followed.length === 0 && (
        <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
          ☆を押してゲームをフォローすると、ここに試合が並びます
        </p>
      )}

      {followed.map((game) => (
        <GameSection
          key={game.slug}
          game={game}
          followed={isFollowed(game.slug)}
          onToggle={() => toggleFollow(game.slug)}
        >
          {renderBody(game, bySlug.get(game.slug) ?? [])}
        </GameSection>
      ))}

      {others.length > 0 && (
        <button
          type="button"
          onClick={() => setShowOthers(!showOthers)}
          className="rounded-xl border border-border-subtle bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {showOthers
            ? "Hide other games ▴"
            : `Show other games (${others.length}) ▾`}
        </button>
      )}

      {showOthers &&
        others.map((game) => (
          <GameSection
            key={game.slug}
            game={game}
            followed={isFollowed(game.slug)}
            onToggle={() => toggleFollow(game.slug)}
          >
            {renderBody(game, bySlug.get(game.slug) ?? [])}
          </GameSection>
        ))}
    </div>
  );
}
