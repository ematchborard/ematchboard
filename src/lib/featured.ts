import { GAMES, getGame, type GameConfig } from "./games";
import { EWC_END, EWC_START } from "./ewc";
import { getMatches, getRunningTournaments } from "./pandascore";
import { getStartggMatches, type StartggGameSlug } from "./startgg";
import type { Match } from "./types";
import { WORLDS_END, WORLDS_SERIE_ID, WORLDS_START } from "./worlds";

// ホームの「今日のビッグマッチ」枠とサイドバーの「開催中の大会」枠で使う
// 横断データ層。/api/today(X投稿下書き用)とも「今日」の定義を共有する。

export function jstTodayRange(): { from: Date; to: Date; dateJst: string } {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60_000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth();
  const d = jst.getUTCDate();
  const dateJst = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // JST 00:00 のその日始まりをUTCに戻す(JSTはUTC+9なので前日15:00Z)
  const fromUtcMs = Date.UTC(y, m, d) - 9 * 60 * 60_000;
  return {
    from: new Date(fromUtcMs),
    to: new Date(fromUtcMs + 24 * 60 * 60_000),
    dateJst,
  };
}

// ライブデータ対応タイトル(eventsOnlyを除く)の「今日(JST)」の試合をまとめて取得
export async function getTodayMatchesAllGames(): Promise<
  { game: GameConfig; matches: Match[] }[]
> {
  const { from, to } = jstTodayRange();
  const liveGames = GAMES.filter((g) => !g.eventsOnly);
  return Promise.all(
    liveGames.map(async (g) => {
      const matches = await (g.liveSource === "startgg"
        ? getStartggMatches(g.slug as StartggGameSlug, from, to)
        : getMatches(g.slug, from, to)
      ).catch(() => []);
      const todays = matches.filter((m) => {
        if (!m.begin_at) return false;
        const t = Date.parse(m.begin_at);
        return t >= from.getTime() && t < to.getTime();
      });
      return { game: g, matches: todays };
    })
  );
}

// 今日の試合のうちtier s/aだけを抜き出す(ホームの「今日のビッグマッチ」枠)。
// LIVE→開始前(時刻順)→終了済みの順、最大6件。TBD戦は除外
export async function getBigMatchesToday(): Promise<
  { match: Match; game: GameConfig }[]
> {
  const perGame = await getTodayMatchesAllGames();
  const all = perGame.flatMap((p) =>
    p.matches.map((match) => ({ match, game: p.game }))
  );
  const big = all.filter(({ match: m }) => {
    const tier = m.tournament?.tier?.toLowerCase();
    if (tier !== "s" && tier !== "a") return false;
    if (!m.opponents[0]?.opponent || !m.opponents[1]?.opponent) return false;
    return true;
  });
  const statusRank = (m: Match) =>
    m.status === "running" ? 0 : m.status === "not_started" ? 1 : 2;
  big.sort((x, y) => {
    const r = statusRank(x.match) - statusRank(y.match);
    if (r !== 0) return r;
    const tx = x.match.begin_at ? Date.parse(x.match.begin_at) : 0;
    const ty = y.match.begin_at ? Date.parse(y.match.begin_at) : 0;
    return tx - ty;
  });
  return big.slice(0, 6);
}

// 開催中(tier s/a)の大会をサイドバー用にシリーズ単位でまとめる。
// PandaScoreではGroup Stage/PlayoffsなどのステージごとにTournamentが分かれて
// いるため、serie_idでグループ化して1大会=1行にし、一番進んでいる
// (開始が一番遅い)ステージ名を代表として出す
export interface RunningSerie {
  key: string;
  gameName: string;
  accent: string;
  leagueName: string;
  serieName: string;
  leagueImage: string | null;
  tier: string;
  stageName: string;
  url: string;
}

// PandaScoreの1シリーズにまとまらない特別イベント(EWCのような複数タイトル
// 横断の大会)を、開催期間中だけ手動で差し込むための配列。
// 新しいイベントを追加したいときはここに1行足すだけでよい
const MANUAL_RUNNING_HIGHLIGHTS: {
  start: string;
  end: string;
  label: string;
  stageName: string;
  url: string;
}[] = [
  {
    start: EWC_START,
    end: EWC_END,
    label: "Esports World Cup",
    stageName: "複数タイトル横断",
    url: "/ewc",
  },
  {
    start: WORLDS_START,
    end: WORLDS_END,
    label: "Worlds 2026",
    stageName: "日本時間の日程まとめ",
    url: "/worlds",
  },
];

export async function getRunningSeries(): Promise<RunningSerie[]> {
  const todayStr = jstTodayRange().dateJst;
  const manual: RunningSerie[] = MANUAL_RUNNING_HIGHLIGHTS.filter(
    (h) => todayStr >= h.start && todayStr <= h.end
  ).map((h) => ({
    key: `manual:${h.url}`,
    gameName: "",
    accent: "#f59e0b",
    leagueName: h.label,
    serieName: "",
    leagueImage: null,
    tier: "s",
    stageName: h.stageName,
    url: h.url,
  }));
  const manualUrls = new Set(manual.map((m) => m.url));

  const raw = await getRunningTournaments();
  const bySerie = new Map<number, (typeof raw)[number]>();
  for (const t of raw) {
    if (!t.serie || !getGame(t.videogame.slug)) continue; // 未対応タイトルは除外
    const existing = bySerie.get(t.serie.id);
    if (!existing || (t.begin_at ?? "") > (existing.begin_at ?? "")) {
      bySerie.set(t.serie.id, t);
    }
  }
  const tierRank = (t: string | null) => (t === "s" ? 0 : t === "a" ? 1 : 2);
  const fromApi: RunningSerie[] = [...bySerie.values()]
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier))
    .map((t) => {
      const game = getGame(t.videogame.slug) as GameConfig;
      // Worldsは専用ページ(/worlds, 日本時間の日程まとめ)に集約する
      const url =
        t.serie.id === WORLDS_SERIE_ID
          ? "/worlds"
          : `/${game.slug}/event/${t.serie.id}`;
      return {
        key: `serie:${t.serie.id}`,
        gameName: game.name,
        accent: game.accent,
        leagueName: t.league.name,
        serieName: t.serie.full_name ?? "",
        leagueImage: t.league.image_url,
        tier: t.tier ?? "",
        stageName: t.name,
        url,
      };
    })
    .filter((s) => !manualUrls.has(s.url));

  return [...manual, ...fromApi].slice(0, 6);
}
