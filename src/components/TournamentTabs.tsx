import Link from "next/link";

// 大会ページ内のコンテンツ種別タブ(トーナメント表/日程・結果/出場チーム)。
// ViewTabsと同じくURLクエリ駆動(?tab=)のサーバーサイド切り替えで、SEO的にも
// タブごとに実際にレンダリングされたHTMLが変わる

export type TournamentTab = "bracket" | "schedule" | "teams";

const TABS: { key: TournamentTab; label: string }[] = [
  { key: "bracket", label: "トーナメント表" },
  { key: "schedule", label: "日程・結果" },
  { key: "teams", label: "出場チーム" },
];

export default function TournamentTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: TournamentTab;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border-subtle bg-surface p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "bracket" ? basePath : `${basePath}?tab=${t.key}`}
          className={`rounded-lg px-2 py-1.5 text-center text-sm font-semibold transition-colors ${
            active === t.key
              ? "bg-surface-hover text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
