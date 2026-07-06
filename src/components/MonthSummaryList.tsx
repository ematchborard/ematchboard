"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/follow";
import { leaguePriority } from "@/lib/popularity";
import type { Match } from "@/lib/types";

// 指定期間内の大会全体(シリーズ)単位のサマリー一覧。
// Monthビュー(ゲームページ/ホーム)で共用する。

interface TournamentSummary {
  key: string;
  serieId: number;
  label: string;
  image: string | null;
  priority: number;
  first: number;
  last: number;
  count: number;
  hasLive: boolean;
  allFinished: boolean;
}

export default function MonthSummaryList({
  matches,
  gameSlug,
  rangeStart,
  rangeEnd,
  emptyText = "No tournaments this month",
}: {
  matches: Match[];
  gameSlug: string;
  rangeStart: number;
  rangeEnd: number;
  emptyText?: string;
}) {
  const { lang } = useLanguage();
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });

  const summaryMap = new Map<string, TournamentSummary>();
  for (const m of matches) {
    if (!m.begin_at) continue;
    const t = Date.parse(m.begin_at);
    if (t < rangeStart || t >= rangeEnd) continue;
    const key = `${m.league.id}:${m.serie.id}`;
    let s = summaryMap.get(key);
    if (!s) {
      const eventName = `${m.league.name} ${m.serie.full_name ?? ""}`.trim();
      s = {
        key,
        serieId: m.serie.id,
        label: eventName,
        image: m.league.image_url,
        priority: leaguePriority(gameSlug, eventName, m.tournament.tier, lang),
        first: t,
        last: t,
        count: 0,
        hasLive: false,
        allFinished: true,
      };
      summaryMap.set(key, s);
    }
    s.first = Math.min(s.first, t);
    s.last = Math.max(s.last, t);
    s.count += 1;
    if (m.status === "running") s.hasLive = true;
    if (m.status !== "finished" && m.status !== "canceled") s.allFinished = false;
  }
  const summaries = [...summaryMap.values()].sort(
    (a, b) => a.priority - b.priority || a.first - b.first
  );

  if (summaries.length === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {summaries.map((s) => (
        <Link
          key={s.key}
          href={`/${gameSlug}/event/${s.serieId}`}
          className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
        >
          {s.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのリーグロゴ
            <img src={s.image} alt="" className="logo-chip h-10 w-10 shrink-0 object-contain" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-xs font-bold text-muted">
              {s.label.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{s.label}</p>
            <p className="text-xs text-muted">
              {dateFormat.format(s.first)}
              {s.first !== s.last && ` – ${dateFormat.format(s.last)}`}
              {` · ${s.count} ${s.count === 1 ? "match" : "matches"}`}
            </p>
          </div>
          {s.hasLive ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              LIVE
            </span>
          ) : (
            <span className="shrink-0 text-xs text-muted">
              {s.allFinished ? "Finished" : "›"}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
