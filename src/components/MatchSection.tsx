"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import MatchRow from "./MatchCard";

// 見出し付きのフラットな試合リスト(チームページの Upcoming / Results 用)。
// 時刻表示をユーザーのタイムゾーンにするため、マウント後に描画する。

export default function MatchSection({
  title,
  matches,
  gameSlug,
  emptyText,
}: {
  title: string;
  matches: Match[];
  gameSlug: string;
  emptyText: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dateFormat = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {!mounted ? (
        <div aria-hidden className="h-24 animate-pulse rounded-xl bg-surface" />
      ) : matches.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
          {emptyText}
        </p>
      ) : (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              gameSlug={gameSlug}
              roundLabel={
                m.begin_at ? dateFormat.format(new Date(m.begin_at)) : null
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
