import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { getMatches, hasApiToken } from "@/lib/pandascore";
import {
  parseDateParam,
  parseOffset,
  parseViewMode,
  rangeFor,
} from "@/lib/range";
import MatchList from "@/components/MatchList";
import MonthOverview from "@/components/MonthOverview";
import ViewTabs from "@/components/ViewTabs";
import WeekSchedule from "@/components/WeekSchedule";

// searchParams を読むのでこのページは毎リクエスト描画になるが、
// PandaScore への実リクエストは pandascore.ts 側の fetch キャッシュ(5分)で抑えられる。
// (force-dynamic を付けると fetch キャッシュまで無効化されるので付けないこと)

interface Props {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ view?: string; o?: string; d?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params;
  const config = getGame(game);
  return {
    title: config
      ? `${config.name} Schedules & Results — eMATCH BOARD`
      : "eMATCH BOARD",
  };
}

export default async function GamePage({ params, searchParams }: Props) {
  const [{ game }, sp] = await Promise.all([params, searchParams]);
  const config = getGame(game);
  if (!config) notFound();

  const view = parseViewMode(sp.view);
  const offset = parseOffset(sp.o);
  const dateStr = parseDateParam(sp.d);

  const { from, to } = rangeFor(view, offset, dateStr);
  const matches = await getMatches(config.slug, from, to);
  const basePath = `/${config.slug}`;

  return (
    <div>
      {!hasApiToken() && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          サンプルデータを表示中 — <code>.env.local</code> に{" "}
          <code>PANDASCORE_TOKEN</code> を設定すると実データに切り替わります
        </p>
      )}
      <ViewTabs basePath={basePath} view={view} />
      {view === "day" && (
        <MatchList
          matches={matches}
          gameSlug={config.slug}
          basePath={basePath}
          selectedDate={dateStr}
        />
      )}
      {view === "week" && (
        <WeekSchedule matches={matches} gameSlug={config.slug} offset={offset} />
      )}
      {view === "month" && (
        <MonthOverview matches={matches} gameSlug={config.slug} offset={offset} />
      )}
    </div>
  );
}
