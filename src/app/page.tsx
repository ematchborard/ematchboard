import { GAMES } from "@/lib/games";
import { getMatches, hasApiToken } from "@/lib/pandascore";
import {
  parseDateParam,
  parseOffset,
  parseViewMode,
  rangeFor,
} from "@/lib/range";
import HomeOverview from "@/components/HomeOverview";
import ViewTabs from "@/components/ViewTabs";

// 総合ホーム: 全ゲームの試合をサーバー側でまとめて取得し、
// どのゲームを表示するか(フォロー)はクライアント側で絞り込む。
// ゲームページと同じく Day(カレンダー付き)/Week/Month で期間を切り替えられる。

interface Props {
  searchParams: Promise<{ view?: string; o?: string; d?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const sp = await searchParams;
  const view = parseViewMode(sp.view);
  const offset = parseOffset(sp.o);
  const dateStr = parseDateParam(sp.d);

  const { from, to } = rangeFor(view, offset, dateStr);
  // eventsOnlyタイトルはPandaScore非対応なのでフェッチしない(ホーム側で大会一覧を出す)
  const perGame = await Promise.all(
    GAMES.filter((g) => !g.eventsOnly).map(async (g) => ({
      slug: g.slug,
      matches: await getMatches(g.slug, from, to).catch(() => []),
    }))
  );

  return (
    <div>
      {!hasApiToken() && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          サンプルデータを表示中 — <code>.env.local</code> に{" "}
          <code>PANDASCORE_TOKEN</code> を設定すると実データに切り替わります
        </p>
      )}
      <ViewTabs basePath="/" view={view} />
      <HomeOverview
        perGame={perGame}
        view={view}
        offset={offset}
        selectedDate={dateStr}
      />
    </div>
  );
}
