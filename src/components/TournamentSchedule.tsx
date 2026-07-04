"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import MatchRow from "./MatchCard";

// 大会の全日程を日付ごとにまとめて表示する。
// 時刻・日付はユーザーのタイムゾーン基準にしたいのでクライアント側で処理
// (サーバー描画だとタイムゾーンがズレるため、マウント前はスケルトン)。

const DAY_MS = 86_400_000;

function localDayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// "Upper bracket semifinal: RBN vs MISA" → "Upper bracket semifinal"
function roundOf(match: Match): string | null {
  if (!match.name || !match.name.includes(":")) return null;
  return match.name.split(":")[0].trim();
}

export default function TournamentSchedule({
  matches,
  gameSlug,
}: {
  matches: Match[];
  gameSlug: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  const todayStart = localDayStart(new Date());
  const dayMap = new Map<number, Match[]>();
  for (const m of matches) {
    if (!m.begin_at) continue;
    const start = localDayStart(new Date(m.begin_at));
    const list = dayMap.get(start) ?? [];
    list.push(m);
    dayMap.set(start, list);
  }
  const days = [...dayMap.entries()].sort((a, b) => a[0] - b[0]);

  const dateFormat = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const labelFor = (start: number) => {
    if (start === todayStart) return "Today";
    if (start === todayStart + DAY_MS) return "Tomorrow";
    if (start === todayStart - DAY_MS) return "Yesterday";
    return null;
  };

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
        No scheduled matches
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map(([start, dayMatches]) => (
        <section key={start}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
            {labelFor(start) ?? dateFormat.format(start)}
            {labelFor(start) && (
              <span className="text-xs font-normal text-muted">
                {dateFormat.format(start)}
              </span>
            )}
          </h3>
          <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
            {dayMatches.map((m) => (
              <MatchRow key={m.id} match={m} gameSlug={gameSlug} roundLabel={roundOf(m)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
