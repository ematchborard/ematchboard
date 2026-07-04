"use client";

import Link from "next/link";
import { useState } from "react";
import { DAY_MS, localDayStart, parseDateStr, toDateStr } from "@/lib/date";

// Dayビューの日付ナビ: ‹ [ラベル+カレンダー] › 。
// 日付はURL(?view=day&d=YYYY-MM-DD)で持つので、リンク遷移=サーバー再取得。
// カレンダーはFotMob風のポップアップ(月送り、今日マーク、選択日ハイライト)。

function Calendar({
  basePath,
  selectedStart,
  onPick,
}: {
  basePath: string;
  selectedStart: number;
  onPick: () => void;
}) {
  const sel = new Date(selectedStart);
  const [viewYear, setViewYear] = useState(sel.getFullYear());
  const [viewMonth, setViewMonth] = useState(sel.getMonth());

  const todayStart = localDayStart(new Date());
  const monthFirst = new Date(viewYear, viewMonth, 1);
  const gridStart = monthFirst.getTime() - monthFirst.getDay() * DAY_MS; // 日曜はじまり
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart + i * DAY_MS);
    return localDayStart(d);
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(monthFirst);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(
      new Date(2026, 1, 1 + i) // 2026-02-01は日曜
    )
  );

  const shiftMonth = (delta: number) => {
    const m = viewMonth + delta;
    setViewYear(viewYear + Math.floor(m / 12));
    setViewMonth(((m % 12) + 12) % 12);
  };

  return (
    <div className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl border border-border-subtle bg-surface p-3 shadow-xl shadow-black/40">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="rounded-lg px-3 py-1 font-semibold text-muted hover:bg-surface-hover hover:text-foreground"
        >
          ‹
        </button>
        <p className="text-sm font-semibold">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="rounded-lg px-3 py-1 font-semibold text-muted hover:bg-surface-hover hover:text-foreground"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekdays.map((w, i) => (
          <span key={i} className="pb-1 text-[10px] font-semibold text-muted">
            {w}
          </span>
        ))}
        {cells.map((start) => {
          const d = new Date(start);
          const inMonth = d.getMonth() === viewMonth;
          const isSelected = start === selectedStart;
          const isToday = start === todayStart;
          return (
            <Link
              key={start}
              href={`${basePath}?view=day&d=${toDateStr(start)}`}
              onClick={onPick}
              className={`rounded-lg py-1.5 text-xs tabular-nums transition-colors ${
                isSelected
                  ? "bg-brand/20 font-bold text-brand"
                  : inMonth
                    ? "text-foreground hover:bg-surface-hover"
                    : "text-muted/40 hover:bg-surface-hover"
              } ${isToday && !isSelected ? "font-bold text-brand" : ""}`}
            >
              {d.getDate()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DateNav({
  basePath,
  selectedDate,
}: {
  basePath: string;
  selectedDate: string;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const selectedStart = parseDateStr(selectedDate) ?? localDayStart(new Date());
  const todayStart = localDayStart(new Date());

  const relLabel =
    selectedStart === todayStart
      ? "Today"
      : selectedStart === todayStart + DAY_MS
        ? "Tomorrow"
        : selectedStart === todayStart - DAY_MS
          ? "Yesterday"
          : null;
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(selectedStart);

  return (
    <div className="relative">
      <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-1">
        <Link
          href={`${basePath}?view=day&d=${toDateStr(selectedStart - DAY_MS)}`}
          aria-label="Previous day"
          className="rounded-lg px-4 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          ‹
        </Link>
        <button
          type="button"
          onClick={() => setCalOpen(!calOpen)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-hover"
        >
          {relLabel ?? dateLabel}
          {relLabel && (
            <span className="text-[11px] font-normal text-muted">{dateLabel}</span>
          )}
          <span className={`text-[9px] text-muted ${calOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        <Link
          href={`${basePath}?view=day&d=${toDateStr(selectedStart + DAY_MS)}`}
          aria-label="Next day"
          className="rounded-lg px-4 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          ›
        </Link>
      </div>
      {calOpen && (
        <Calendar
          basePath={basePath}
          selectedStart={selectedStart}
          onPick={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}
