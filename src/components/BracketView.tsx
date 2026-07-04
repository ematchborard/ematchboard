import Link from "next/link";
import type { BracketMatch, Team } from "@/lib/types";

// トーナメント表。previous_matches(どの試合の勝者が来るか)から各試合の
// ラウンド(深さ)を計算し、ラウンドごとの列を横スクロールで並べる。
// ダブルエリミネーション形式は試合名から Upper / Lower に分けて2段で表示。

function computeDepths(matches: BracketMatch[]): Map<number, number> {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const depths = new Map<number, number>();

  const visit = (m: BracketMatch, stack: Set<number>): number => {
    const known = depths.get(m.id);
    if (known !== undefined) return known;
    if (stack.has(m.id)) return 1; // 循環データ保険
    stack.add(m.id);
    const prevDepths = (m.previous_matches ?? [])
      .map((p) => byId.get(p.match_id))
      .filter((pm): pm is BracketMatch => Boolean(pm))
      .map((pm) => visit(pm, stack));
    const depth = prevDepths.length > 0 ? Math.max(...prevDepths) + 1 : 1;
    depths.set(m.id, depth);
    return depth;
  };

  for (const m of matches) visit(m, new Set());
  return depths;
}

// "Upper bracket semifinal 2: RBN vs MISA" → "Upper bracket semifinal"
function roundLabelOf(m: BracketMatch, depth: number): string {
  if (m.name && m.name.includes(":")) {
    return m.name.split(":")[0].trim().replace(/\s*\d+$/, "");
  }
  return `Round ${depth}`;
}

function TeamLine({
  team,
  score,
  loser,
  gameSlug,
}: {
  team: Team | null;
  score: number | null;
  loser: boolean;
  gameSlug: string;
}) {
  const inner = (
    <>
      {team?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
        <img src={team.image_url} alt="" className="h-5 w-5 object-contain" />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted">
          {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-xs font-medium group-hover/team:underline">
        {team?.name ?? "TBD"}
      </span>
      {score !== null && (
        <span className="text-xs font-semibold tabular-nums">{score}</span>
      )}
    </>
  );
  const className = `flex items-center gap-2 ${loser ? "opacity-50" : ""}`;

  if (!team) return <div className={className}>{inner}</div>;
  return (
    <Link
      href={`/${gameSlug}/team/${team.id}`}
      className={`${className} group/team`}
    >
      {inner}
    </Link>
  );
}

function BracketCard({
  match,
  gameSlug,
}: {
  match: BracketMatch;
  gameSlug: string;
}) {
  const teamA = match.opponents[0]?.opponent ?? null;
  const teamB = match.opponents[1]?.opponent ?? null;
  const scoreFor = (team: Team | null) =>
    team && match.results.length > 0
      ? (match.results.find((r) => r.team_id === team.id)?.score ?? null)
      : null;
  const finished = match.status === "finished";

  return (
    <div className="relative flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface-hover/40 px-3 py-2.5">
      {match.status === "running" && (
        <span className="absolute -top-1.5 right-2 inline-flex items-center gap-1 rounded bg-background px-1 text-[9px] font-bold text-live">
          <span className="h-1 w-1 animate-pulse rounded-full bg-live" />
          LIVE
        </span>
      )}
      <TeamLine
        team={teamA}
        score={scoreFor(teamA)}
        loser={finished && match.winner_id !== null && teamA?.id !== match.winner_id}
        gameSlug={gameSlug}
      />
      <TeamLine
        team={teamB}
        score={scoreFor(teamB)}
        loser={finished && match.winner_id !== null && teamB?.id !== match.winner_id}
        gameSlug={gameSlug}
      />
    </div>
  );
}

function BracketSection({
  title,
  matches,
  depths,
  gameSlug,
}: {
  title: string | null;
  matches: BracketMatch[];
  depths: Map<number, number>;
  gameSlug: string;
}) {
  const columns = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    const d = depths.get(m.id) ?? 1;
    const list = columns.get(d) ?? [];
    list.push(m);
    columns.set(d, list);
  }
  const sorted = [...columns.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-3">
          {sorted.map(([depth, roundMatches]) => (
            <div key={depth} className="flex w-52 shrink-0 flex-col">
              <p className="mb-2 truncate text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                {roundLabelOf(roundMatches[0], depth)}
              </p>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {roundMatches
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => (
                    <BracketCard key={m.id} match={m} gameSlug={gameSlug} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BracketView({
  matches,
  gameSlug,
}: {
  matches: BracketMatch[];
  gameSlug: string;
}) {
  const depths = computeDepths(matches);
  const lower = matches.filter((m) => /lower bracket|losers?[' ]/i.test(m.name));
  const lowerIds = new Set(lower.map((m) => m.id));
  const upper = matches.filter((m) => !lowerIds.has(m.id));
  const isDoubleElim = lower.length > 0;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface px-4 py-4">
      <BracketSection
        title={isDoubleElim ? "Upper Bracket" : null}
        matches={upper}
        depths={depths}
        gameSlug={gameSlug}
      />
      {isDoubleElim && (
        <BracketSection
          title="Lower Bracket"
          matches={lower}
          depths={depths}
          gameSlug={gameSlug}
        />
      )}
    </div>
  );
}
