"use client";

import { useEffect, useState } from "react";
import { localDayStart, parseDateStr, toDateStr } from "@/lib/date";
import type { Match } from "@/lib/types";
import DateNav from "./DateNav";
import TournamentGroups from "./TournamentGroups";

// Dayビュー: ‹ › とカレンダーで任意の日付に移動できる(URLの?d=YYYY-MM-DDで指定)。
// 日付のグルーピングと時刻表示は「ユーザーの」タイムゾーンで行いたいので
// クライアント側で実施する。マウント前はスケルトンを出す。

export default function MatchList({
  matches,
  gameSlug,
  basePath,
  selectedDate,
}: {
  matches: Match[];
  gameSlug: string;
  basePath: string;
  selectedDate: string | null;
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

  const effectiveDate = selectedDate ?? toDateStr(localDayStart(new Date()));
  const selectedStart =
    parseDateStr(effectiveDate) ?? localDayStart(new Date());

  const dayMatches = matches.filter(
    (m) => m.begin_at && localDayStart(new Date(m.begin_at)) === selectedStart
  );

  return (
    <div className="flex flex-col gap-3">
      <DateNav basePath={basePath} selectedDate={effectiveDate} />
      <TournamentGroups
        matches={dayMatches}
        gameSlug={gameSlug}
        emptyText="No matches on this day"
      />
    </div>
  );
}
