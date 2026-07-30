import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import {
  getSerie,
  getSerieMatches,
  getSerieTournaments,
} from "@/lib/pandascore";
import { jsonLdString } from "@/lib/seo";
import StageTabs from "@/components/StageTabs";
import TournamentSchedule from "@/components/TournamentSchedule";

// 大会全体ページ (例: EWC 2026 の全体)。
// 全ステージ横断の日程を出し、StageTabs から各ステージ(Group A / Playoffs 等)へ。
// データの鮮度は pandascore.ts の fetch キャッシュ(5分)で管理。

interface Props {
  params: Promise<{ game: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const serie = await getSerie(Number(id));
  const title = serie
    ? `${serie.league.name} ${serie.full_name ?? ""}`.trim()
    : "Event";
  return { title: `${title} — eMATCH BOARD` };
}

export default async function EventPage({ params }: Props) {
  const { game, id: idParam } = await params;
  const config = getGame(game);
  const id = Number(idParam);
  if (!config || !Number.isFinite(id)) notFound();

  const [serie, stages, matches] = await Promise.all([
    getSerie(id),
    getSerieTournaments(id),
    getSerieMatches(id),
  ]);
  if (!serie) notFound();

  const title = `${serie.league.name} ${serie.full_name ?? ""}`.trim();
  const dateFormat = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const period =
    serie.begin_at && serie.end_at
      ? `${dateFormat.format(new Date(serie.begin_at))} – ${dateFormat.format(new Date(serie.end_at))}`
      : null;
  const sortedStages = stages
    .slice()
    .sort(
      (a, b) =>
        (a.begin_at ? Date.parse(a.begin_at) : 0) -
          (b.begin_at ? Date.parse(b.begin_at) : 0) ||
        a.name.localeCompare(b.name)
    );

  // 検索エンジン向けの構造化データ(大会=スポーツイベント)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: title,
    sport: config.name,
    startDate: serie.begin_at ?? undefined,
    endDate: serie.end_at ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    organizer: { "@type": "Organization", name: serie.league.name },
    url: `https://ematchboard.com/${config.slug}/event/${serie.id}`,
  };

  return (
    <div className="flex flex-col gap-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <Link
        href={`/${config.slug}`}
        className="text-xs text-muted hover:text-foreground"
      >
        ‹ {config.name} matches
      </Link>

      <header className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-4">
        {serie.league.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのリーグロゴ
          <img
            src={serie.league.image_url}
            alt=""
            className="h-16 w-16 shrink-0 object-contain"
          />
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-base font-bold"
            style={{ backgroundColor: `${config.accent}22`, color: config.accent }}
          >
            {config.short}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          <p className="text-xs text-muted">
            {config.name}
            {period && ` · ${period}`}
            {` · ${matches.length} matches`}
          </p>
        </div>
      </header>

      <StageTabs
        gameSlug={config.slug}
        serieId={serie.id}
        stages={sortedStages.map((s) => ({ id: s.id, name: s.name }))}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold">Schedule & Results</h2>
        <TournamentSchedule matches={matches} gameSlug={config.slug} />
      </section>
    </div>
  );
}
