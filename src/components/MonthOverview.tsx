"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import MonthSummaryList from "./MonthSummaryList";
import PeriodNav from "./PeriodNav";

// ゲームページのMonthビュー: その月に試合がある大会全体(シリーズ)の一覧を ‹ › で月送り。

export default function MonthOverview({
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
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1).getTime();
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(monthStart);

  return (
    <div className="flex flex-col gap-3">
      <PeriodNav
        prevHref={`/${gameSlug}?view=month&o=${offset - 1}`}
        nextHref={`/${gameSlug}?view=month&o=${offset + 1}`}
        label={monthLabel}
        badge={offset === 0 ? "This month" : null}
      />
      <MonthSummaryList
        matches={matches}
        gameSlug={gameSlug}
        rangeStart={monthStart}
        rangeEnd={monthEnd}
      />
    </div>
  );
}
