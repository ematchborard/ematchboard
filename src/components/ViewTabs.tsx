import Link from "next/link";
import type { ViewMode } from "@/lib/range";

// Day / Week / Month のビュー切り替え。リンク遷移なのでサーバー側で
// そのビューに必要な期間のデータを取り直す。ホーム(/)とゲームページ両対応。

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export default function ViewTabs({
  basePath,
  view,
}: {
  basePath: string;
  view: ViewMode;
}) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border-subtle bg-surface p-1">
      {VIEWS.map((v) => (
        <Link
          key={v.key}
          href={v.key === "day" ? basePath : `${basePath}?view=${v.key}`}
          className={`rounded-lg px-2 py-1.5 text-center text-sm font-semibold transition-colors ${
            view === v.key
              ? "bg-surface-hover text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
