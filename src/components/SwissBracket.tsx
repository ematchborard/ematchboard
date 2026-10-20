import Link from "next/link";
import type { Match, Team } from "@/lib/types";

// 16チームSwiss形式(Worldsのグループステージ等)向けの簡易ブラケット表示。
// PandaScoreはSwiss形式の正式なブラケット/順位表データを返さず(標準の
// /tournaments/:id/brackets, /standings は空)、Round2以降の対戦カードも前の
// ラウンド結果が出るまでTBDのままなので、完全な公式グラフィック再現はできない。
// 代わりに「ラウンドごとに何勝何敗同士が当たるか」という構造(2024年以降の
// Worlds/MSIで使われている標準Swiss-13形式)は試合数から確定的に分かるので、
// それをテンプレートとして各ラウンドの実試合(BO数・開始時刻)を割り当てる。
// 実際のチーム名はPandaScoreがopponentsを埋めている試合だけ表示し、
// まだ埋まっていない対戦はTBDのまま出す(でっち上げない)。

interface BucketTemplate {
  label: string;
  count: number; // このbucketの試合数
  bo: number; // number_of_games
}
interface RoundTemplate {
  round: number;
  heading: string;
  buckets: BucketTemplate[];
}
interface TerminalBucket {
  label: string;
  status: "advance" | "eliminate";
  size: number; // チーム数
}

const ROUND_TEMPLATES: RoundTemplate[] = [
  { round: 1, heading: "Round 1 (BO1)", buckets: [{ label: "0-0", count: 8, bo: 1 }] },
  {
    round: 2,
    heading: "Round 2 (BO1)",
    buckets: [
      { label: "1-0", count: 4, bo: 1 },
      { label: "0-1", count: 4, bo: 1 },
    ],
  },
  {
    round: 3,
    heading: "Round 3",
    buckets: [
      { label: "2-0", count: 2, bo: 3 },
      { label: "1-1", count: 4, bo: 1 },
      { label: "0-2", count: 2, bo: 3 },
    ],
  },
  {
    round: 4,
    heading: "Round 4 (BO3)",
    buckets: [
      { label: "2-1", count: 3, bo: 3 },
      { label: "1-2", count: 3, bo: 3 },
    ],
  },
  { round: 5, heading: "Round 5 (BO3)", buckets: [{ label: "2-2", count: 3, bo: 3 }] },
];

const TERMINAL_BUCKETS: TerminalBucket[] = [
  { label: "3-0", status: "advance", size: 2 },
  { label: "3-1", status: "advance", size: 3 },
  { label: "3-2", status: "advance", size: 3 },
  { label: "0-3", status: "eliminate", size: 2 },
  { label: "1-3", status: "eliminate", size: 3 },
  { label: "2-3", status: "eliminate", size: 3 },
];

function roundNumberOf(match: Match): number | null {
  const m = /round\s+(\d+)/i.exec(match.name ?? "");
  return m ? Number(m[1]) : null;
}

// ラウンド内の試合を、BO数(number_of_games)でプールしたうえで開始時刻順に
// テンプレートのbucket数ずつ切り出す。同じBO同士の複数bucket(Round2の1-0/0-1等)は
// 開始時刻順の前半/後半で便宜上分けている(PandaScoreにbucket情報自体が無いため)
function splitIntoBuckets(matches: Match[], buckets: BucketTemplate[]): Match[][] {
  const sorted = matches
    .slice()
    .sort((a, b) => (a.begin_at ? Date.parse(a.begin_at) : 0) - (b.begin_at ? Date.parse(b.begin_at) : 0));
  const byBo = new Map<number, Match[]>();
  for (const m of sorted) {
    const list = byBo.get(m.number_of_games) ?? [];
    list.push(m);
    byBo.set(m.number_of_games, list);
  }
  const consumed = new Map<number, number>();
  return buckets.map((b) => {
    const pool = byBo.get(b.bo) ?? [];
    const start = consumed.get(b.bo) ?? 0;
    consumed.set(b.bo, start + b.count);
    return pool.slice(start, start + b.count);
  });
}

// 確定済み(finished)試合の勝敗からチームごとの現在の成績を積み上げる。
// 3勝/3敗に達したチームを「結果」列(ADVANCES/ELIMINATED)に出すのに使う
function computeRecords(matches: Match[]): Map<number, { team: Team; wins: number; losses: number }> {
  const byRound = matches
    .slice()
    .sort((a, b) => (roundNumberOf(a) ?? 0) - (roundNumberOf(b) ?? 0));
  const records = new Map<number, { team: Team; wins: number; losses: number }>();
  for (const m of byRound) {
    if (m.status !== "finished" || m.winner_id === null) continue;
    for (const o of m.opponents) {
      const team = o.opponent;
      if (!team) continue;
      const rec = records.get(team.id) ?? { team, wins: 0, losses: 0 };
      if (team.id === m.winner_id) rec.wins += 1;
      else rec.losses += 1;
      records.set(team.id, rec);
    }
  }
  return records;
}

function TeamLogo({ team }: { team: Team | null }) {
  if (team?.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
    return <img src={team.image_url} alt="" className="h-5 w-5 shrink-0 object-contain" />;
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[8px] font-bold text-muted">
      {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
    </span>
  );
}

function MatchSlot({ match, gameSlug }: { match: Match | undefined; gameSlug: string }) {
  const teamA = match?.opponents[0]?.opponent ?? null;
  const teamB = match?.opponents[1]?.opponent ?? null;
  const inner = (
    <>
      <TeamLogo team={teamA} />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
        {teamA?.name ?? "TBD"}
      </span>
      <span className="shrink-0 text-[10px] text-muted">vs</span>
      <span className="min-w-0 flex-1 truncate text-right text-[11px] font-medium">
        {teamB?.name ?? "TBD"}
      </span>
      <TeamLogo team={teamB} />
    </>
  );
  const className =
    "flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-hover/40 px-2 py-1.5";
  if (!match) return <div className={className}>{inner}</div>;
  return (
    <Link href={`/${gameSlug}/match/${match.id}`} className={`${className} transition-colors hover:bg-surface-hover`}>
      {inner}
    </Link>
  );
}

function TerminalSlot({ team }: { team: Team | null }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-hover/40 px-2 py-1.5">
      <TeamLogo team={team} />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
        {team?.name ?? "TBD"}
      </span>
    </div>
  );
}

export default function SwissBracket({
  matches,
  gameSlug,
}: {
  matches: Match[];
  gameSlug: string;
}) {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const r = roundNumberOf(m);
    if (r === null) continue;
    const list = byRound.get(r) ?? [];
    list.push(m);
    byRound.set(r, list);
  }

  // 実データが想定の試合数と食い違う場合(シーズン構成が変わった等)は
  // 誤った構造を描かずに諦める
  const matchesTotal = ROUND_TEMPLATES.every((rt) => {
    const expected = rt.buckets.reduce((sum, b) => sum + b.count, 0);
    return (byRound.get(rt.round)?.length ?? 0) === expected;
  });
  if (!matchesTotal) return null;

  const records = computeRecords(matches);
  const advancedByLabel = new Map<string, Team[]>();
  const eliminatedByLabel = new Map<string, Team[]>();
  for (const rec of records.values()) {
    const label = `${rec.wins}-${rec.losses}`;
    if (rec.wins === 3) advancedByLabel.set(label, [...(advancedByLabel.get(label) ?? []), rec.team]);
    if (rec.losses === 3) eliminatedByLabel.set(label, [...(eliminatedByLabel.get(label) ?? []), rec.team]);
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-stretch gap-3">
        {ROUND_TEMPLATES.map((rt) => {
          const roundMatches = byRound.get(rt.round) ?? [];
          const buckets = splitIntoBuckets(roundMatches, rt.buckets);
          return (
            <div key={rt.round} className="flex w-60 shrink-0 flex-col gap-3">
              <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                {rt.heading}
              </p>
              {rt.buckets.map((b, i) => (
                <div key={b.label} className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold text-muted">{b.label}</p>
                  {Array.from({ length: b.count }).map((_, slot) => (
                    <MatchSlot key={slot} match={buckets[i][slot]} gameSlug={gameSlug} />
                  ))}
                </div>
              ))}
            </div>
          );
        })}

        <div className="flex w-52 shrink-0 flex-col gap-3">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
            結果
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-brand">ADVANCES</p>
            {TERMINAL_BUCKETS.filter((b) => b.status === "advance").map((b) => {
              const teams = advancedByLabel.get(b.label) ?? [];
              return Array.from({ length: b.size }).map((_, i) => (
                <TerminalSlot key={`${b.label}-${i}`} team={teams[i] ?? null} />
              ));
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-muted">ELIMINATED</p>
            {TERMINAL_BUCKETS.filter((b) => b.status === "eliminate").map((b) => {
              const teams = eliminatedByLabel.get(b.label) ?? [];
              return Array.from({ length: b.size }).map((_, i) => (
                <TerminalSlot key={`${b.label}-${i}`} team={teams[i] ?? null} />
              ));
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
