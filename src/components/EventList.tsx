"use client";

import { useEffect, useState } from "react";
import type { ManualEvent } from "@/lib/manual-events";

// Events onlyタイトル(Apex/Fortnite/TFT)の大会カード一覧。
// 開催中/終了のステータスは閲覧時点に依存するのでマウント後に付ける。

function formatRange(e: ManualEvent): string {
  if (e.dateNote) return e.dateNote;
  const fmt = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const start = new Date(e.startDate);
  const end = new Date(e.endDate);
  const year = new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return e.startDate === e.endDate
    ? `${fmt.format(start)}, ${year}`
    : `${fmt.format(start)} – ${fmt.format(end)}, ${year}`;
}

function statusOf(e: ManualEvent, now: number): "live" | "upcoming" | "finished" {
  const start = Date.parse(e.startDate);
  const end = Date.parse(e.endDate) + 86_400_000;
  if (now >= start && now < end) return "live";
  return now < start ? "upcoming" : "finished";
}

export default function EventList({ events }: { events: ManualEvent[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
        No events in this period
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => {
        const status = now === null ? null : statusOf(e, now);
        return (
          <div
            key={e.id}
            className="rounded-xl border border-border-subtle bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${
                    status === "finished" ? "opacity-60" : ""
                  }`}
                >
                  {e.name}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatRange(e)}
                  {e.location && ` · ${e.location}`}
                  {e.prizePool && ` · ${e.prizePool}`}
                </p>
              </div>
              {status === "live" && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-live">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                  LIVE
                </span>
              )}
              {status === "finished" && (
                <span className="shrink-0 text-xs text-muted">Finished</span>
              )}
              {status === "live" && e.streamUrl && (
                <a
                  href={e.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-live/15 px-3 py-1.5 text-xs font-semibold text-live transition-colors hover:bg-live/25"
                >
                  Watch
                </a>
              )}
              {e.detailsUrl && (
                <a
                  href={e.detailsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  Details
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
