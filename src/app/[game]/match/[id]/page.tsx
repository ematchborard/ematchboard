import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import {
  getMatch,
  getTeam,
  getTeamRecentMatches,
} from "@/lib/pandascore";
import type { Match, Team } from "@/lib/types";
import { jsonLdString } from "@/lib/seo";
import LocalTime from "@/components/LocalTime";
import MatchLineups from "@/components/MatchLineups";
import MatchRow from "@/components/MatchCard";

// 試合詳細ページ。
// 試合前: 両チームのロスター・直近フォーム・過去の対戦成績(H2H)
// 試合中/後: マップごとの勝敗とスコア
// ※選手単位の詳細スタッツと勝率オッズはPandaScoreの有料プラン限定のため未対応

interface Props {
  params: Promise<{ game: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatch(Number(id));
  const a = match?.opponents[0]?.opponent?.name ?? "TBD";
  const b = match?.opponents[1]?.opponent?.name ?? "TBD";
  return {
    title: match ? `${a} vs ${b} — eMATCH BOARD` : "Match — eMATCH BOARD",
  };
}

function TeamLogo({ team, size }: { team: Team | null; size: string }) {
  if (team?.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
    return (
      <img src={team.image_url} alt="" className={`logo-chip ${size} object-contain`} />
    );
  }
  return (
    <span
      className={`${size} flex items-center justify-center rounded-full bg-surface-hover text-sm font-bold text-muted`}
    >
      {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
    </span>
  );
}

// 直近5戦のW/L(この試合自体は除く)
function formOf(recent: Match[], teamId: number, excludeMatchId: number): string[] {
  return recent
    .filter((m) => m.id !== excludeMatchId && m.status === "finished")
    .slice(0, 5)
    .map((m) => (m.winner_id === teamId ? "W" : "L"));
}

export default async function MatchPage({ params }: Props) {
  const { game, id: idParam } = await params;
  const config = getGame(game);
  const id = Number(idParam);
  if (!config || !Number.isFinite(id)) notFound();

  const match = await getMatch(id);
  if (!match) notFound();

  const teamARef = match.opponents[0]?.opponent ?? null;
  const teamBRef = match.opponents[1]?.opponent ?? null;
  const [teamA, teamB, recentA, recentB] = await Promise.all([
    teamARef ? getTeam(teamARef.id) : Promise.resolve(null),
    teamBRef ? getTeam(teamBRef.id) : Promise.resolve(null),
    teamARef ? getTeamRecentMatches(teamARef.id) : Promise.resolve([]),
    teamBRef ? getTeamRecentMatches(teamBRef.id) : Promise.resolve([]),
  ]);

  const scoreOf = (team: Team | null) =>
    team ? (match.results.find((r) => r.team_id === team.id)?.score ?? null) : null;
  const scoreA = scoreOf(teamARef);
  const scoreB = scoreOf(teamBRef);
  const running = match.status === "running";
  const finished = match.status === "finished";
  const eventName = `${match.league.name} ${match.serie.full_name ?? ""}`.trim();

  const h2h =
    teamARef && teamBRef
      ? recentA.filter(
          (m) =>
            m.id !== match.id &&
            m.status === "finished" &&
            m.opponents.some((o) => o.opponent.id === teamBRef.id)
        )
      : [];
  const h2hAWins = h2h.filter((m) => m.winner_id === teamARef?.id).length;
  const h2hBWins = h2h.filter((m) => m.winner_id === teamBRef?.id).length;

  const formA = teamARef ? formOf(recentA, teamARef.id, match.id) : [];
  const formB = teamBRef ? formOf(recentB, teamBRef.id, match.id) : [];

  const nameOf = (teamId: number | null) =>
    teamId === teamARef?.id
      ? (teamARef?.name ?? "?")
      : teamId === teamBRef?.id
        ? (teamBRef?.name ?? "?")
        : "?";
  const showMaps =
    match.games.length > 0 && (finished || running) && match.results.length > 0;
  const streams = match.streams_list.filter((s) => s.raw_url);

  // 検索エンジン向けの構造化データ(試合=スポーツイベント+対戦チーム)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${teamARef?.name ?? "TBD"} vs ${teamBRef?.name ?? "TBD"} — ${eventName}`,
    sport: config.name,
    startDate: match.begin_at ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    competitor: [teamARef, teamBRef]
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({ "@type": "SportsTeam", name: t.name })),
    superEvent: { "@type": "SportsEvent", name: eventName },
    url: `https://ematchboard.com/${config.slug}/match/${match.id}`,
  };

  return (
    <div className="flex flex-col gap-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <Link
        href={`/${config.slug}/event/${match.serie.id}`}
        className="text-xs text-muted hover:text-foreground"
      >
        ‹ {eventName}
      </Link>

      <header className="rounded-xl border border-border-subtle bg-surface px-4 py-4">
        <p className="mb-3 text-center text-xs text-muted">
          {eventName} · {match.tournament.name} · BO{match.number_of_games}
        </p>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={teamARef ? `/${config.slug}/team/${teamARef.id}` : "#"}
            className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            <TeamLogo team={teamARef} size="h-14 w-14" />
            <span
              className={`w-full truncate text-sm font-semibold ${
                finished && match.winner_id !== teamARef?.id ? "opacity-50" : ""
              }`}
            >
              {teamARef?.name ?? "TBD"}
            </span>
          </Link>

          <div className="shrink-0 px-2 text-center">
            {finished || running ? (
              <>
                <p className="text-3xl font-bold tabular-nums">
                  {scoreA ?? 0}
                  <span className="px-1.5 text-muted">–</span>
                  {scoreB ?? 0}
                </p>
                {running ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-live">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                    LIVE
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-muted">Final</p>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold">
                {match.begin_at ? <LocalTime iso={match.begin_at} /> : "TBD"}
              </p>
            )}
          </div>

          <Link
            href={teamBRef ? `/${config.slug}/team/${teamBRef.id}` : "#"}
            className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            <TeamLogo team={teamBRef} size="h-14 w-14" />
            <span
              className={`w-full truncate text-sm font-semibold ${
                finished && match.winner_id !== teamBRef?.id ? "opacity-50" : ""
              }`}
            >
              {teamBRef?.name ?? "TBD"}
            </span>
          </Link>
        </div>
        {streams.length > 0 && !finished && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {streams.slice(0, 4).map((s) => (
              <a
                key={s.raw_url}
                href={s.raw_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-live/15 px-3 py-1.5 text-xs font-semibold text-live transition-colors hover:bg-live/25"
              >
                Watch{s.language ? ` (${s.language.toUpperCase()})` : ""}
              </a>
            ))}
          </div>
        )}
      </header>

      {showMaps && (
        <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
          <h2 className="border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5 text-sm font-semibold">
            Maps
          </h2>
          <div className="divide-y divide-border-subtle">
            {match.games.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-14 shrink-0 text-xs font-semibold text-muted">
                  Map {g.position}
                </span>
                {g.status === "finished" && g.winner?.id ? (
                  <span className="font-medium">{nameOf(g.winner.id)} win</span>
                ) : g.status === "running" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-live">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                    In progress
                  </span>
                ) : (
                  <span className="text-xs text-muted">Upcoming</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        {[
          { team: teamARef, form: formA },
          { team: teamBRef, form: formB },
        ].map((x, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-subtle bg-surface px-4 py-3"
          >
            <p className="mb-2 truncate text-xs font-semibold text-muted">
              {x.team?.name ?? "TBD"} — Recent form
            </p>
            {x.form.length === 0 ? (
              <p className="text-xs text-muted">No recent matches</p>
            ) : (
              <div className="flex gap-1">
                {x.form.map((r, j) => (
                  <span
                    key={j}
                    className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold ${
                      r === "W"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-live/15 text-live"
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {h2h.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">
            Head to head
            <span className="ml-2 text-xs font-normal text-muted">
              {teamARef?.acronym ?? teamARef?.name} {h2hAWins} – {h2hBWins}{" "}
              {teamBRef?.acronym ?? teamBRef?.name}
            </span>
          </h2>
          <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
            {h2h.slice(0, 3).map((m) => (
              <MatchRow key={m.id} match={m} gameSlug={config.slug} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Lineups</h2>
        <MatchLineups teamA={teamA} teamB={teamB} />
      </section>
    </div>
  );
}
