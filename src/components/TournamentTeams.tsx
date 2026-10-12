import Link from "next/link";
import { countryFlag } from "@/lib/country";
import type { Standing, Team } from "@/lib/types";

// 「出場チーム」タブ。standingsがあれば戦績(W-L)を突き合わせて出す(トーナメント表
// 形式でstandingsが無い大会はロスターのみ)。location="JP"のチームはJPバッジを付ける

function TeamRow({
  team,
  gameSlug,
  record,
}: {
  team: Team;
  gameSlug: string;
  record: { wins: number; losses: number } | null;
}) {
  const flag = countryFlag(team.location);
  const isJp = team.location?.toUpperCase() === "JP";
  return (
    <Link
      href={`/${gameSlug}/team/${team.id}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
    >
      {team.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
        <img
          src={team.image_url}
          alt=""
          className="h-6 w-6 shrink-0 object-contain"
        />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted">
          {(team.acronym ?? team.name).slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {team.name}
      </span>
      {isJp && (
        <span className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">
          JP
        </span>
      )}
      {flag && (
        <span className="shrink-0 text-sm" aria-hidden>
          {flag}
        </span>
      )}
      {record && (
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {record.wins}W - {record.losses}L
        </span>
      )}
    </Link>
  );
}

export default function TournamentTeams({
  teams,
  standings,
  gameSlug,
}: {
  teams: Team[];
  standings: Standing[] | null;
  gameSlug: string;
}) {
  if (teams.length === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
        No team data available
      </p>
    );
  }

  const recordByTeam = new Map(
    (standings ?? [])
      .filter((s) => typeof s.wins === "number" && typeof s.losses === "number")
      .map((s) => [s.team.id, { wins: s.wins as number, losses: s.losses as number }])
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <h2 className="border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5 text-sm font-semibold">
        Teams ({teams.length})
      </h2>
      <div className="divide-y divide-border-subtle">
        {teams.map((team) => (
          <TeamRow
            key={team.id}
            team={team}
            gameSlug={gameSlug}
            record={recordByTeam.get(team.id) ?? null}
          />
        ))}
      </div>
    </section>
  );
}
