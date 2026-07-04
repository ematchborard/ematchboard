import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { getTeam, getTeamMatches } from "@/lib/pandascore";
import MatchSection from "@/components/MatchSection";
import TeamFollowButton from "@/components/TeamFollowButton";

interface Props {
  params: Promise<{ game: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeam(Number(id));
  return {
    title: team ? `${team.name} — eMATCH BOARD` : "Team — eMATCH BOARD",
  };
}

export default async function TeamPage({ params }: Props) {
  const { game, id: idParam } = await params;
  const config = getGame(game);
  const id = Number(idParam);
  if (!config || !Number.isFinite(id)) notFound();

  const [team, teamMatches] = await Promise.all([
    getTeam(id),
    getTeamMatches(id),
  ]);
  if (!team) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/${config.slug}`} className="text-xs text-muted hover:text-foreground">
        ‹ {config.name} matches
      </Link>

      <header className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-4">
        {team.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
          <img src={team.image_url} alt="" className="h-14 w-14 shrink-0 object-contain" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-lg font-bold text-muted">
            {(team.acronym ?? team.name).slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{team.name}</h1>
          <p className="text-xs text-muted">
            {config.name}
            {team.acronym && ` · ${team.acronym}`}
            {team.location && ` · ${team.location}`}
          </p>
        </div>
        <TeamFollowButton
          team={{
            id: team.id,
            name: team.name,
            acronym: team.acronym,
            image_url: team.image_url,
            game: config.slug,
          }}
        />
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Roster</h2>
        {team.players.length === 0 ? (
          <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
            No roster data
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {team.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-2.5"
              >
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 外部CDNの選手写真
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-muted">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {p.name}
                    {p.role && (
                      <span className="ml-1.5 text-[10px] font-medium uppercase text-brand">
                        {p.role}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
                    {p.nationality && ` · ${p.nationality}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <MatchSection
        title="Upcoming"
        matches={teamMatches.upcoming}
        gameSlug={config.slug}
        emptyText="No upcoming matches"
      />
      <MatchSection
        title="Recent Results"
        matches={teamMatches.past}
        gameSlug={config.slug}
        emptyText="No recent matches"
      />
    </div>
  );
}
