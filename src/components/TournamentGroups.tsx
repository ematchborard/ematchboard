"use client";

import Link from "next/link";
import type { Match } from "@/lib/types";
import { useLanguage } from "@/lib/follow";
import { leaguePriority, matchesRegion } from "@/lib/popularity";
import MatchRow from "./MatchCard";

// 試合を大会全体(リーグ×シリーズ)ごとにまとめ、人気大会順に並べて表示する共通部品。
// Day/Week/ホームから使う。ヘッダーのタップで大会全体ページ(/event/:serieId)へ。
// 選択言語に近い地域の大会は上に押し上げたうえで📍バッジを付け、効果が見える形にする。

interface Group {
  key: string;
  serieId: number;
  label: string;
  image: string | null;
  priority: number;
  regional: boolean;
  matches: Match[];
}

export function groupByTournament(
  matches: Match[],
  gameSlug: string,
  lang?: string
): Group[] {
  const groupMap = new Map<string, Group>();
  for (const m of matches) {
    if (!m.league || !m.serie) continue;
    const key = `${m.league.id}:${m.serie.id}`;
    let group = groupMap.get(key);
    if (!group) {
      const eventName = `${m.league.name} ${m.serie.full_name ?? ""}`.trim();
      group = {
        key,
        serieId: m.serie.id,
        label: eventName,
        image: m.league.image_url,
        priority: leaguePriority(gameSlug, eventName, m.tournament?.tier, lang),
        regional: matchesRegion(eventName, lang),
        matches: [],
      };
      groupMap.set(key, group);
    }
    group.matches.push(m);
  }
  return [...groupMap.values()].sort(
    (a, b) => a.priority - b.priority || a.label.localeCompare(b.label)
  );
}

export default function TournamentGroups({
  matches,
  gameSlug,
  emptyText = "No matches",
  maxGroups,
  maxMatchesPerGroup,
}: {
  matches: Match[];
  gameSlug: string;
  emptyText?: string;
  maxGroups?: number; // ホームのダイジェスト表示用: 上位N大会に絞る
  maxMatchesPerGroup?: number; // 同: 大会ごとの試合行をN件に絞る
}) {
  const { lang } = useLanguage();
  const groups = groupByTournament(matches, gameSlug, lang).slice(
    0,
    maxGroups ?? Infinity
  );

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <section
          key={group.key}
          className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
        >
          <Link
            href={`/${gameSlug}/event/${group.serieId}`}
            className="flex items-center gap-3 border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5 transition-colors hover:bg-surface-hover"
          >
            {group.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのリーグロゴ
              <img
                src={group.image}
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-[10px] font-bold text-muted">
                {group.label.slice(0, 2).toUpperCase()}
              </span>
            )}
            <h2 className="min-w-0 truncate text-sm font-semibold">{group.label}</h2>
            {group.regional && (
              <span
                className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand"
                title="選択した言語/地域に近い大会"
              >
                📍
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted">
              {group.matches.length} ›
            </span>
          </Link>
          <div className="divide-y divide-border-subtle">
            {group.matches
              .slice(0, maxMatchesPerGroup ?? Infinity)
              .map((m) => (
                <MatchRow key={m.id} match={m} gameSlug={gameSlug} />
              ))}
            {maxMatchesPerGroup !== undefined &&
              group.matches.length > maxMatchesPerGroup && (
                <Link
                  href={`/${gameSlug}/event/${group.serieId}`}
                  className="block px-4 py-2 text-center text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  Show all {group.matches.length} matches ›
                </Link>
              )}
          </div>
        </section>
      ))}
    </div>
  );
}
