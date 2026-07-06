import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import {
  getSerieTournaments,
  getTournament,
  getTournamentBrackets,
  getTournamentMatches,
  getTournamentStandings,
} from "@/lib/pandascore";
import BracketView from "@/components/BracketView";
import StageTabs from "@/components/StageTabs";
import TournamentSchedule from "@/components/TournamentSchedule";

interface Props {
  params: Promise<{ game: string; id: string }>;
}

function tournamentTitle(leagueName: string, serieFullName: string | null, stageName: string) {
  const event = `${leagueName} ${serieFullName ?? ""}`.trim();
  return `${event} · ${stageName}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tournament = await getTournament(Number(id));
  return {
    title: tournament
      ? `${tournamentTitle(tournament.league.name, tournament.serie.full_name, tournament.name)} — eMATCH BOARD`
      : "Tournament — eMATCH BOARD",
  };
}

export default async function TournamentPage({ params }: Props) {
  const { game, id: idParam } = await params;
  const config = getGame(game);
  const id = Number(idParam);
  if (!config || !Number.isFinite(id)) notFound();

  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const [matches, standings, brackets, siblingStages] = await Promise.all([
    getTournamentMatches(id),
    getTournamentStandings(id),
    getTournamentBrackets(id),
    tournament.serie?.id
      ? getSerieTournaments(tournament.serie.id)
      : Promise.resolve([]),
  ]);
  const sortedStages = siblingStages
    .slice()
    .sort(
      (a, b) =>
        (a.begin_at ? Date.parse(a.begin_at) : 0) -
          (b.begin_at ? Date.parse(b.begin_at) : 0) ||
        a.name.localeCompare(b.name)
    );

  const dateFormat = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const period =
    tournament.begin_at && tournament.end_at
      ? `${dateFormat.format(new Date(tournament.begin_at))} – ${dateFormat.format(new Date(tournament.end_at))}`
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={
          tournament.serie?.id
            ? `/${config.slug}/event/${tournament.serie.id}`
            : `/${config.slug}`
        }
        className="text-xs text-muted hover:text-foreground"
      >
        ‹{" "}
        {`${tournament.league.name} ${tournament.serie.full_name ?? ""}`.trim()}
      </Link>

      <header className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-4">
        {tournament.league.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのリーグロゴ
          <img
            src={tournament.league.image_url}
            alt=""
            className="logo-chip h-16 w-16 shrink-0 object-contain"
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
          <h1 className="truncate text-lg font-bold">
            {tournamentTitle(tournament.league.name, tournament.serie.full_name, tournament.name)}
          </h1>
          <p className="text-xs text-muted">
            {config.name}
            {period && ` · ${period}`}
            {tournament.tier && ` · Tier ${tournament.tier.toUpperCase()}`}
          </p>
        </div>
      </header>

      {tournament.serie?.id && sortedStages.length > 0 && (
        <StageTabs
          gameSlug={config.slug}
          serieId={tournament.serie.id}
          stages={sortedStages.map((s) => ({ id: s.id, name: s.name }))}
          activeTournamentId={tournament.id}
        />
      )}

      {brackets && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Bracket</h2>
          <BracketView matches={brackets} gameSlug={config.slug} />
        </section>
      )}

      {standings && (
        <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
          <h2 className="border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5 text-sm font-semibold">
            Standings
          </h2>
          <div className="divide-y divide-border-subtle">
            {standings.map((s) => (
              <Link
                key={s.team.id}
                href={`/${config.slug}/team/${s.team.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted tabular-nums">
                  {s.rank}
                </span>
                {s.team.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
                  <img src={s.team.image_url} alt="" className="logo-chip h-5 w-5 object-contain" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted">
                    {(s.team.acronym ?? s.team.name).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {s.team.name}
                </span>
                {typeof s.wins === "number" && typeof s.losses === "number" && (
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {s.wins}W - {s.losses}L
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Schedule & Results</h2>
        <TournamentSchedule matches={matches} gameSlug={config.slug} />
      </section>
    </div>
  );
}
