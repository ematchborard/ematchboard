import Link from "next/link";
import type { Match, Team } from "@/lib/types";

// 大会グループの中の1行。リーグ名はグループヘッダーに出るのでここでは出さない。
// 行全体が試合詳細(ラインナップ)ページへの1つのリンク。チームへのリンクは
// 置かず、試合詳細ページに遷移してからチームをタップする導線に統一する。

function scoreFor(match: Match, team: Team | null): number | null {
  if (!team || match.results.length === 0) return null;
  return match.results.find((r) => r.team_id === team.id)?.score ?? null;
}

function TeamLogo({ team }: { team: Team | null }) {
  if (team?.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ。ドメインが多数あるのでnext/imageは使わない
    return <img src={team.image_url} alt="" className="h-6 w-6 shrink-0 object-contain" />;
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted">
      {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
    </span>
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
  const scoreA = scoreFor(match, teamA);
  const scoreB = scoreFor(match, teamB);
  const dimA = finished && match.winner_id !== null && teamA?.id !== match.winner_id;
  const dimB = finished && match.winner_id !== null && teamB?.id !== match.winner_id;
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
      {/* 行全体を試合詳細(ラインナップ)ページへのリンクにする */}
      <Link
        href={`/${gameSlug}/match/${match.id}`}
        aria-label="View match lineups and details"
        className="absolute inset-0"
      />
      <div className="pointer-events-none relative flex items-center gap-3">
        <div className="w-11 shrink-0 text-center">
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
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-right text-sm font-medium ${dimA ? "opacity-50" : ""}`}
          >
            {teamA?.name ?? "TBD"}
          </span>
          <span className={dimA ? "opacity-50" : ""}>
            <TeamLogo team={teamA} />
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {scoreA !== null && scoreB !== null ? `${scoreA} – ${scoreB}` : "vs"}
          </span>
          <span className={dimB ? "opacity-50" : ""}>
            <TeamLogo team={teamB} />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-left text-sm font-medium ${dimB ? "opacity-50" : ""}`}
          >
            {teamB?.name ?? "TBD"}
          </span>
        </div>
        {roundLabel && (
          <span className="hidden max-w-28 shrink-0 truncate text-right text-[10px] text-muted sm:block">
            {roundLabel}
          </span>
        )}
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
