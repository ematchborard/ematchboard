import Link from "next/link";
import type { Match, Team } from "@/lib/types";

// 大会グループの中の1行。リーグ名はグループヘッダーに出るのでここでは出さない。
// チーム名はチームページへのリンク。

function scoreFor(match: Match, team: Team | null): number | null {
  if (!team || match.results.length === 0) return null;
  return match.results.find((r) => r.team_id === team.id)?.score ?? null;
}

function TeamRow({
  team,
  score,
  dimmed,
  gameSlug,
}: {
  team: Team | null;
  score: number | null;
  dimmed: boolean;
  gameSlug: string;
}) {
  const inner = (
    <>
      {team?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ。ドメインが多数あるのでnext/imageは使わない
        <img src={team.image_url} alt="" className="logo-chip h-5 w-5 object-contain" />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted">
          {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover/team:underline">
        {team?.name ?? "TBD"}
      </span>
      {score !== null && (
        <span className="text-sm font-semibold tabular-nums">{score}</span>
      )}
    </>
  );
  const className = `flex items-center gap-2 ${dimmed ? "opacity-50" : ""}`;

  if (!team) return <div className={className}>{inner}</div>;
  return (
    <Link
      href={`/${gameSlug}/team/${team.id}`}
      className={`${className} group/team pointer-events-auto`}
    >
      {inner}
    </Link>
  );
}

export default function MatchRow({
  match,
  gameSlug,
  roundLabel,
}: {
  match: Match;
  gameSlug: string;
  roundLabel?: string | null;
}) {
  const teamA = match.opponents[0]?.opponent ?? null;
  const teamB = match.opponents[1]?.opponent ?? null;
  const running = match.status === "running";
  const finished = match.status === "finished";
  const stream =
    match.streams_list.find((s) => s.main)?.raw_url ??
    match.streams_list.find((s) => s.official)?.raw_url ??
    match.streams_list[0]?.raw_url ??
    null;
  const time = match.begin_at
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(match.begin_at))
    : "TBD";

  return (
    <div className="relative px-4 py-3 transition-colors hover:bg-surface-hover">
      {/* 行全体を試合詳細ページへのリンクにする(内側のチーム/配信リンクが優先) */}
      <Link
        href={`/${gameSlug}/match/${match.id}`}
        aria-label="Match details"
        className="absolute inset-0"
      />
      <div className="pointer-events-none relative flex items-center gap-3">
        <div className="w-12 shrink-0 text-center">
          {running ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              LIVE
            </span>
          ) : finished ? (
            <span className="text-xs font-semibold text-muted">FT</span>
          ) : match.status === "canceled" || match.status === "postponed" ? (
            <span className="text-[10px] font-semibold uppercase text-muted">
              {match.status}
            </span>
          ) : (
            <span className="text-sm font-semibold tabular-nums">{time}</span>
          )}
          <span className="mt-0.5 block text-[10px] text-muted">
            BO{match.number_of_games}
          </span>
        </div>
        <div className="w-px self-stretch bg-border-subtle" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <TeamRow
            team={teamA}
            score={scoreFor(match, teamA)}
            dimmed={finished && match.winner_id !== null && teamA?.id !== match.winner_id}
            gameSlug={gameSlug}
          />
          <TeamRow
            team={teamB}
            score={scoreFor(match, teamB)}
            dimmed={finished && match.winner_id !== null && teamB?.id !== match.winner_id}
            gameSlug={gameSlug}
          />
        </div>
        {roundLabel && (
          <span className="hidden max-w-28 shrink-0 truncate text-right text-[10px] text-muted sm:block">
            {roundLabel}
          </span>
        )}
        <Link
          href={`/${gameSlug}/match/${match.id}`}
          aria-label="View lineups and match details"
          className="pointer-events-auto shrink-0 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Lineups ›
        </Link>
        {running && stream && (
          <a
            href={stream}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto shrink-0 rounded-lg bg-live/15 px-3 py-1.5 text-xs font-semibold text-live transition-colors hover:bg-live/25"
          >
            Watch
          </a>
        )}
      </div>
    </div>
  );
}
