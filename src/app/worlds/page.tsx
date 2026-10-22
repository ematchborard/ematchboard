import type { Metadata } from "next";
import Link from "next/link";
import { getGame } from "@/lib/games";
import { kvCache } from "@/lib/pandascore";
import { jsonLdString } from "@/lib/seo";
import type { Match, Team } from "@/lib/types";
import { WORLDS_SERIE_ID, WORLDS_YEAR } from "@/lib/worlds";
import { readWorldsSnapshot } from "@/lib/worlds-snapshot";
import StageTabs from "@/components/StageTabs";

// Worlds専用のSEOランディングページ。「Worlds 2026 日程 日本時間」のような
// 検索意図に向けて、既存の/[game]/event/[id]とは別に、日本時間を明示した
// 日程表をサーバー側で固定フォーマットして出す(クライアント側の
// ブラウザタイムゾーン依存だとクローラーに「日本時間」として読ませられないため)。
// URLは年を含めず固定(/worlds)にして、毎年このページを使い回す
// (WORLDS_SERIE_ID等はlib/worlds.tsでシーズンごとに更新する)。

const GAME_SLUG = "lol";
const JST_TZ = "Asia/Tokyo";

export const metadata: Metadata = {
  title: `Worlds ${WORLDS_YEAR} 日程・結果【日本時間】League of Legends世界選手権 | eMATCH BOARD`,
  description: `LoL世界選手権「Worlds ${WORLDS_YEAR}」の全試合日程を日本時間でまとめて掲載。グループステージ・プレーオフの開始時刻と結果、出場16チームを随時更新。`,
  openGraph: {
    title: `Worlds ${WORLDS_YEAR} 日程・結果【日本時間】`,
    description: `LoL世界選手権「Worlds ${WORLDS_YEAR}」の全試合を日本時間で。グループステージ・プレーオフの日程と結果をまとめてチェック。`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Worlds ${WORLDS_YEAR} 日程・結果【日本時間】`,
    description: `LoL世界選手権「Worlds ${WORLDS_YEAR}」の全試合を日本時間で。グループステージ・プレーオフの日程と結果をまとめてチェック。`,
  },
  alternates: { canonical: "/worlds" },
};

function jstDayKey(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: JST_TZ }).format(new Date(iso));
}
function jstDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}
function jstTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
function roundOf(match: Match): string | null {
  if (!match.name || !match.name.includes(":")) return null;
  return match.name.split(":")[0].trim();
}

function TeamLogo({ team, size = "h-6 w-6" }: { team: Team | null; size?: string }) {
  if (team?.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
    return <img src={team.image_url} alt="" className={`${size} shrink-0 object-contain`} />;
  }
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold text-muted`}
    >
      {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
    </span>
  );
}

function ScheduleRow({ match }: { match: Match }) {
  const teamA = match.opponents[0]?.opponent ?? null;
  const teamB = match.opponents[1]?.opponent ?? null;
  const running = match.status === "running";
  const finished = match.status === "finished";
  const scoreOf = (team: Team | null) =>
    team ? (match.results.find((r) => r.team_id === team.id)?.score ?? null) : null;
  const scoreA = scoreOf(teamA);
  const scoreB = scoreOf(teamB);
  // 未開始の試合もPandaScoreがresultsに0を入れてくることがあるので、
  // スコア表示はLIVE/終了済みに限定する(開始前は常に"vs")
  const showScore = (running || finished) && scoreA !== null && scoreB !== null;
  const round = roundOf(match);

  return (
    <Link
      href={`/${GAME_SLUG}/match/${match.id}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
    >
      <div className="w-14 shrink-0 text-center">
        {running ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            LIVE
          </span>
        ) : finished ? (
          <span className="text-xs font-semibold text-muted">FT</span>
        ) : (
          <span className="text-sm font-semibold tabular-nums">
            {match.begin_at ? jstTime(match.begin_at) : "TBD"}
          </span>
        )}
      </div>
      <div className="w-px self-stretch bg-border-subtle" />
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium">
          {teamA?.name ?? "TBD"}
        </span>
        <TeamLogo team={teamA} />
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {showScore ? `${scoreA} – ${scoreB}` : "vs"}
        </span>
        <TeamLogo team={teamB} />
        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
          {teamB?.name ?? "TBD"}
        </span>
      </div>
      {round && (
        <span className="hidden max-w-28 shrink-0 truncate text-right text-[10px] text-muted sm:block">
          {round}
        </span>
      )}
    </Link>
  );
}

function PlayInSection({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <section
      key="play-in"
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
    >
      <h2 className="border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5 text-sm font-semibold">
        予選(Play-In)結果
      </h2>
      <div className="divide-y divide-border-subtle">
        {matches.map((m) => (
          <ScheduleRow key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}

function GroupStageSection({ matches }: { matches: Match[] }) {
  const byDay = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m.begin_at) continue;
    const key = jstDayKey(m.begin_at);
    const list = byDay.get(key) ?? [];
    list.push(m);
    byDay.set(key, list);
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <section key="group-stage">
      <h2 className="mb-2 text-sm font-semibold">グループステージ 日程(日本時間)</h2>
      {days.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
          日程は近日公開予定です
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(([key, dayMatches]) => (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold">
                {jstDayLabel(dayMatches[0].begin_at as string)}
              </h3>
              <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
                {dayMatches
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.begin_at ? Date.parse(a.begin_at) : 0) -
                      (b.begin_at ? Date.parse(b.begin_at) : 0)
                  )
                  .map((m) => (
                    <ScheduleRow key={m.id} match={m} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayoffsSection({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <section
      key="playoffs"
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
    >
      <h2 className="border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5 text-sm font-semibold">
        プレーオフ 主要日程(日本時間)
      </h2>
      <div className="divide-y divide-border-subtle">
        {matches.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium">{roundOf(m) ?? m.name}</span>
            <span className="shrink-0 text-xs text-muted">
              {m.begin_at ? `${jstDayLabel(m.begin_at)} ${jstTime(m.begin_at)}〜` : "TBD"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function WorldsPage() {
  const config = getGame(GAME_SLUG)!;
  const snapshot = await readWorldsSnapshot(await kvCache());

  // Cronの初回実行前(デプロイ直後)、または前回分も含めて丸ごと空の場合だけ
  // ここに入る。PandaScoreへは直接取りに行かず、空白のまま出すよりも
  // 分かりやすいメッセージだけ表示する
  if (
    !snapshot ||
    (!snapshot.serie && snapshot.tournaments.length === 0 && snapshot.matches.length === 0)
  ) {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/${config.slug}`} className="text-xs text-muted hover:text-foreground">
          ‹ {config.name} matches
        </Link>
        <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
          読み込み中です。少し待って再読み込みしてください。
        </p>
      </div>
    );
  }

  const { serie, tournaments: stages, matches } = snapshot;

  const sortedStages = stages
    .slice()
    .sort(
      (a, b) =>
        (a.begin_at ? Date.parse(a.begin_at) : 0) -
        (b.begin_at ? Date.parse(b.begin_at) : 0)
    );
  const playIn = sortedStages.find((s) => s.name === "Play-In");
  const groupStage = sortedStages.find((s) => s.name === "Group Stage");
  const playoffs = sortedStages.find((s) => s.name === "Playoffs");

  const playInMatches = matches
    .filter((m) => m.tournament.id === playIn?.id)
    .sort((a, b) => (a.begin_at ? Date.parse(a.begin_at) : 0) - (b.begin_at ? Date.parse(b.begin_at) : 0));
  const groupMatches = matches.filter((m) => m.tournament.id === groupStage?.id);
  const playoffMatches = matches
    .filter((m) => m.tournament.id === playoffs?.id)
    .sort((a, b) => (a.begin_at ? Date.parse(a.begin_at) : 0) - (b.begin_at ? Date.parse(b.begin_at) : 0));

  const teams = groupStage?.teams ?? [];

  // 「現在のステージ」= 開始日を過ぎている中で一番遅いもの(どのステージも
  // 未開始ならPlay-In=先頭)。これを一番上に出し、StageTabsの選択状態も合わせる。
  // 例: 今はPlay-In → Play-Inが先頭。Group Stage開始後はGroup Stageが先頭に切り替わる
  const now = new Date().getTime();
  let currentStage = sortedStages[0];
  for (const s of sortedStages) {
    if (s.begin_at && Date.parse(s.begin_at) <= now) currentStage = s;
  }

  const sectionByStageId = new Map<number, React.ReactNode>();
  if (playIn)
    sectionByStageId.set(playIn.id, <PlayInSection key="play-in" matches={playInMatches} />);
  if (groupStage)
    sectionByStageId.set(
      groupStage.id,
      <GroupStageSection key="group-stage" matches={groupMatches} />
    );
  if (playoffs)
    sectionByStageId.set(
      playoffs.id,
      <PlayoffsSection key="playoffs" matches={playoffMatches} />
    );
  const orderedSections = currentStage
    ? [
        currentStage.id,
        ...sortedStages.filter((s) => s.id !== currentStage.id).map((s) => s.id),
      ]
        .map((id) => sectionByStageId.get(id))
        .filter(Boolean)
    : [...sectionByStageId.values()];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `League of Legends World Championship ${WORLDS_YEAR}`,
    sport: config.name,
    startDate: serie?.begin_at ?? undefined,
    endDate: serie?.end_at ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    organizer: { "@type": "Organization", name: serie?.league?.name ?? "Riot Games" },
    url: "https://ematchboard.com/worlds",
  };

  return (
    <div className="flex flex-col gap-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <Link href={`/${config.slug}`} className="text-xs text-muted hover:text-foreground">
        ‹ {config.name} matches
      </Link>

      <header className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-4">
        {serie?.league?.image_url ? (
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
          <h1 className="truncate text-lg font-bold">
            Worlds {WORLDS_YEAR} 日程・結果【日本時間】
          </h1>
          <p className="mt-1 text-xs text-muted">
            League of Legends World Championship {WORLDS_YEAR} ·{" "}
            {serie?.begin_at && jstDayLabel(serie.begin_at)}
            {serie?.end_at && ` 〜 ${jstDayLabel(serie.end_at)}`}
          </p>
          <p className="mt-2 text-xs text-muted">
            グループステージ・プレーオフの全試合を日本時間(JST)でまとめています。
          </p>
        </div>
      </header>

      {sortedStages.length > 0 && (
        <StageTabs
          gameSlug={config.slug}
          serieId={WORLDS_SERIE_ID}
          stages={sortedStages.map((s) => ({ id: s.id, name: s.name }))}
          activeTournamentId={currentStage?.id}
        />
      )}

      {orderedSections}

      {teams.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">出場チーム({teams.length})</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2.5"
              >
                <TeamLogo team={t} size="h-7 w-7" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{t.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
