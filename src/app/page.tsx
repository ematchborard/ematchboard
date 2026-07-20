import { Suspense } from "react";
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
//
// データ取得(12ゲーム分の並列フェッチ)は Suspense で分離し、シェル(見出し・
// タブ)を即座に送信してからストリーミングする。5分ISRキャッシュが切れた
// 直後の訪問者でも初期表示が固まらないようにするため(Core Web Vitals対策)。

interface Props {
  searchParams: Promise<{ view?: string; o?: string; d?: string }>;
}

async function HomeMatchData({
  view,
  offset,
  dateStr,
}: {
  view: ReturnType<typeof parseViewMode>;
  offset: number;
  dateStr: string | null;
}) {
  const { from, to } = rangeFor(view, offset, dateStr);
  // eventsOnlyタイトルはPandaScore非対応なのでフェッチしない(ホーム側で大会一覧を出す)
  const perGame = await Promise.all(
    GAMES.filter((g) => !g.eventsOnly).map(async (g) => ({
      slug: g.slug,
      matches: await getMatches(g.slug, from, to).catch(() => []),
    }))
  );

  return (
    <HomeOverview
      perGame={perGame}
      view={view}
      offset={offset}
      selectedDate={dateStr}
    />
  );
}

function HomeSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}

export default async function Home({ searchParams }: Props) {
  const sp = await searchParams;
  const view = parseViewMode(sp.view);
  const offset = parseOffset(sp.o);
  const dateStr = parseDateParam(sp.d);

  return (
    <div>
      {/* 検索エンジン向けのサーバー描画テキスト。データ取得を待たず即座に送信される */}
      <div className="mb-3">
        <h1 className="text-lg font-bold">Esports Schedules & Results</h1>
        <p className="mt-0.5 text-xs text-muted">
          Every esports match in one place — VALORANT, League of Legends, CS2,
          Dota 2 and {GAMES.length - 4} more games, in your local timezone.
        </p>
      </div>
      {!hasApiToken() && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          サンプルデータを表示中 — <code>.env.local</code> に{" "}
          <code>PANDASCORE_TOKEN</code> を設定すると実データに切り替わります
        </p>
      )}
      <ViewTabs basePath="/" view={view} />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeMatchData view={view} offset={offset} dateStr={dateStr} />
      </Suspense>
    </div>
  );
}
