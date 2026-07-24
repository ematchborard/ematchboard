import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GAMES, type GameConfig } from "@/lib/games";
import {
  EWC_END,
  EWC_GAME_WINDOWS,
  EWC_INFO_URL,
  EWC_LOCATION,
  EWC_PRIZE_POOL,
  EWC_START,
  EWC_YEAR,
  isEwcMatch,
} from "@/lib/ewc";
import { ewcManualEvents, type ManualEvent } from "@/lib/manual-events";
import { getMatches } from "@/lib/pandascore";
import { jsonLdString } from "@/lib/seo";
import type { Match } from "@/lib/types";
import EventList from "@/components/EventList";
import MatchRow from "@/components/MatchCard";

// Esports World Cup 横断ハブ。24タイトルにまたがるEWCだけを1ページに集約する、
// このサイトならではのページ(単一タイトル特化の競合サイトにはできない構成)。
// データ取得はSuspenseで分離し、シェル(見出し)を即座に返してから
// ストリーミングする(ホームページと同じCore Web Vitals対策)。

export const metadata: Metadata = {
  title: `Esports World Cup ${EWC_YEAR} — All Games Schedule & Results`,
  description: `Esports World Cup ${EWC_YEAR} schedule and results across every game — VALORANT, League of Legends, CS2, Dota 2, Apex Legends and more — in your local timezone.`,
};

const DAY_MS = 86_400_000;

interface Section {
  game: GameConfig;
  matches: Match[];
  events: ManualEvent[];
  rank: number; // 小さいほど上(進行中→開催間近→終了済み)
}

function matchSortKey(m: Match): [number, number] {
  const t = m.begin_at ? Date.parse(m.begin_at) : 0;
  if (m.status === "running") return [0, t];
  if (m.status === "not_started") return [1, t];
  return [2, -t]; // 終了済みは新しい結果を上に
}

function sectionRank(matches: Match[], events: ManualEvent[]): number {
  const now = Date.now();
  const hasLiveMatch = matches.some((m) => m.status === "running");
  const hasLiveEvent = events.some((e) => {
    const s = Date.parse(e.startDate);
    const en = Date.parse(e.endDate) + DAY_MS;
    return now >= s && now < en;
  });
  if (hasLiveMatch || hasLiveEvent) return 0;

  const upcoming = matches
    .filter((m) => m.status === "not_started" && m.begin_at)
    .map((m) => Date.parse(m.begin_at!));
  const upcomingEvents = events
    .filter((e) => Date.parse(e.startDate) > now)
    .map((e) => Date.parse(e.startDate));
  const nextUp = [...upcoming, ...upcomingEvents];
  if (nextUp.length > 0) return Math.min(...nextUp);

  // 全て終了済み: 最新の終了時刻が新しいものを上に(値を反転)
  const finished = matches
    .filter((m) => m.begin_at)
    .map((m) => Date.parse(m.begin_at!));
  const finishedEvents = events.map((e) => Date.parse(e.endDate));
  const all = [...finished, ...finishedEvents];
  return all.length > 0 ? -Math.max(...all) : Number.MAX_SAFE_INTEGER;
}

async function EwcMatchData() {
  const apiGames = GAMES.filter((g) => !g.eventsOnly && EWC_GAME_WINDOWS[g.slug]);
  const perGame = await Promise.all(
    apiGames.map(async (g) => {
      const win = EWC_GAME_WINDOWS[g.slug];
      const matches = await getMatches(
        g.slug,
        new Date(Date.parse(win.start) - DAY_MS),
        new Date(Date.parse(win.end) + DAY_MS)
      ).catch(() => []);
      return { game: g, matches: matches.filter(isEwcMatch) };
    })
  );

  const manualEvents = ewcManualEvents();
  const eventsOnlyGames = GAMES.filter((g) => g.eventsOnly);

  const sections: Section[] = [
    ...perGame
      .filter((p) => p.matches.length > 0)
      .map((p) => ({
        game: p.game,
        matches: p.matches
          .slice()
          .sort((a, b) => {
            const ka = matchSortKey(a);
            const kb = matchSortKey(b);
            return ka[0] - kb[0] || ka[1] - kb[1];
          }),
        events: [] as ManualEvent[],
        rank: sectionRank(p.matches, []),
      })),
    ...eventsOnlyGames
      .map((g) => ({
        game: g,
        matches: [] as Match[],
        events: manualEvents.filter((e) => e.game === g.slug),
        rank: 0,
      }))
      .filter((s) => s.events.length > 0)
      .map((s) => ({ ...s, rank: sectionRank([], s.events) })),
  ].sort((a, b) => a.rank - b.rank);

  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
        No Esports World Cup {EWC_YEAR} matches found right now. Check back as
        the schedule progresses.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ game, matches, events }) => {
        const serieId = matches[0]?.serie.id;
        const shown = matches.slice(0, 15);
        return (
          <section key={game.slug}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
                style={{ backgroundColor: `${game.accent}22`, color: game.accent }}
              >
                {game.short}
              </span>
              <Link
                href={`/${game.slug}`}
                className="truncate text-sm font-bold hover:underline"
              >
                {game.name}
              </Link>
              {serieId !== undefined && (
                <Link
                  href={`/${game.slug}/event/${serieId}`}
                  className="ml-auto shrink-0 text-xs text-muted hover:text-foreground"
                >
                  Full schedule ›
                </Link>
              )}
            </div>
            {events.length > 0 ? (
              <EventList events={events} />
            ) : (
              <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
                {shown.map((m) => (
                  <MatchRow key={m.id} match={m} gameSlug={game.slug} />
                ))}
              </div>
            )}
            {matches.length > shown.length && serieId !== undefined && (
              <Link
                href={`/${game.slug}/event/${serieId}`}
                className="mt-1 block text-center text-xs text-muted hover:text-foreground"
              >
                +{matches.length - shown.length} more matches ›
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EwcSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}

export default function EwcPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `Esports World Cup ${EWC_YEAR}`,
    startDate: EWC_START,
    endDate: EWC_END,
    location: { "@type": "Place", name: EWC_LOCATION },
    eventStatus: "https://schema.org/EventScheduled",
    url: "https://ematchboard.com/ewc",
  };
  const dateFmt = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <header className="rounded-xl border border-border-subtle bg-surface px-4 py-4">
        <h1 className="text-lg font-bold">Esports World Cup {EWC_YEAR}</h1>
        <p className="mt-1 text-xs text-muted">
          {dateFmt.format(new Date(EWC_START))} –{" "}
          {dateFmt.format(new Date(EWC_END))}, {EWC_YEAR} · {EWC_LOCATION} ·{" "}
          {EWC_PRIZE_POOL} prize pool across 24 games
        </p>
        <p className="mt-2 text-xs text-muted">
          Every EWC match and event across every game we cover, in one place —
          in your local timezone.{" "}
          <a
            href={EWC_INFO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Official info ↗
          </a>
        </p>
      </header>
      <Suspense fallback={<EwcSkeleton />}>
        <EwcMatchData />
      </Suspense>
    </div>
  );
}
