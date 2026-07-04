"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import TournamentGroups from "./TournamentGroups";

// Weekビュー: 月曜はじまりの1週間を ‹ › で送る。
// 週の境界はユーザーのタイムゾーン基準にしたいのでクライアント側で計算する
// (サーバーは前後にパディングした広めの期間を取得して渡してくる)。

const DAY_MS = 86_400_000;

function localDayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export default function WeekSchedule({
  matches,
  gameSlug,
  offset,
}: {
  matches: Match[];
  gameSlug: string;
  offset: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  const todayStart = localDayStart(new Date());
  const dow = (new Date(todayStart).getDay() + 6) % 7; // 月曜=0
  const weekStart = todayStart - dow * DAY_MS + offset * 7 * DAY_MS;

  const dateFormat = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  const dayFormat = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const days = Array.from({ length: 7 }, (_, i) => weekStart + i * DAY_MS)
    .map((start) => ({
      start,
      matches: matches.filter(
        (m) => m.begin_at && localDayStart(new Date(m.begin_at)) === start
      ),
    }))
    .filter((d) => d.matches.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-1">
        <Link
          href={`/${gameSlug}?view=week&o=${offset - 1}`}
          aria-label="Previous week"
          className="rounded-lg px-4 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          ‹
        </Link>
        <p className="text-sm font-semibold">
          {dateFormat.format(weekStart)} – {dateFormat.format(weekStart + 6 * DAY_MS)}
          {offset === 0 && (
            <span className="ml-1.5 text-[11px] font-normal text-brand">
              This week
            </span>
          )}
        </p>
        <Link
          href={`/${gameSlug}?view=week&o=${offset + 1}`}
          aria-label="Next week"
          className="rounded-lg px-4 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          ›
        </Link>
      </div>

      {days.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
          No matches this week
        </p>
      ) : (
        days.map((day) => (
          <section key={day.start}>
            <h3 className="mb-2 mt-1 text-sm font-semibold">
              {dayFormat.format(day.start)}
              {day.start === todayStart && (
                <span className="ml-2 text-[11px] font-normal text-brand">
                  Today
                </span>
              )}
            </h3>
            <TournamentGroups matches={day.matches} gameSlug={gameSlug} />
          </section>
        ))
      )}
    </div>
  );
}
