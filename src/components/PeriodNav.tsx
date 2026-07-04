"use client";

import Link from "next/link";

// Week/Monthビュー用の ‹ [ラベル] › ナビバー(リンク遷移でサーバー再取得)

export default function PeriodNav({
  prevHref,
  nextHref,
  label,
  badge,
}: {
  prevHref: string;
  nextHref: string;
  label: string;
  badge?: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-1">
      <Link
        href={prevHref}
        aria-label="Previous"
        className="rounded-lg px-4 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        ‹
      </Link>
      <p className="text-sm font-semibold">
        {label}
        {badge && (
          <span className="ml-1.5 text-[11px] font-normal text-brand">{badge}</span>
        )}
      </p>
      <Link
        href={nextHref}
        aria-label="Next"
        className="rounded-lg px-4 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        ›
      </Link>
    </div>
  );
}
