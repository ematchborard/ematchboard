import { cache } from "react";
import { GAMES, getGame, type GameConfig } from "./games";
import { EWC_END, EWC_START } from "./ewc";
import { jstTodayRange } from "./jst";
import { getMatches, getRunningTournaments, kvCache } from "./pandascore";
import { getStartggMatches, type StartggGameSlug } from "./startgg";
import { readTodaySnapshot } from "./today-snapshot";
import type { Match } from "./types";
import {
  WORLDS_END,
  WORLDS_LEAGUE_IMAGE,
  WORLDS_SERIE_ID,
  WORLDS_START,
} from "./worlds";

// ホームの「今日のビッグマッチ」枠とサイドバーの「開催中の大会」枠で使う
// 横断データ層。/api/today(X投稿下書き用)とも「今日」の定義を共有する。

export { jstTodayRange };

// Cronスナップショットの読み取りをリクエスト単位でメモ化(React cache)。
// ホームでは getTodayMatchesAllGames と getRunningSeries の両方が同じ
// スナップショットを読むので、1リクエスト内でのKV二重読みを避ける
const getSnapshot = cache(async () => readTodaySnapshot(await kvCache()));

function filterToday(matches: Match[], from: Date, to: Date): Match[] {
  return matches.filter((m) => {
    if (!m.begin_at) return false;
    const t = Date.parse(m.begin_at);
    return t >= from.getTime() && t < to.getTime();
  });
}

// ライブデータ対応タイトル(eventsOnlyを除く)の「今日(JST)」の試合をまとめて取得。
// PandaScore採用ゲームはCronが書いたスナップショット(today-snapshot.ts)を読むだけで、
// リクエストのたびにPandaScoreを叩くことはしない(アクセス数に比例して無料枠を
// 消費していた問題への対応、2026-10-21)。スナップショットがまだ無い場合
// (デプロイ直後でCronが一度も走っていない等)だけ直接取得にフォールバックする。
// start.gg採用タイトル(Smash/SF6)はPandaScoreと別の軽いAPIなので対象外、
// 従来通りstartgg.ts側のキャッシュ経由で直接取得する
export async function getTodayMatchesAllGames(): Promise<
  { game: GameConfig; matches: Match[] }[]
> {
  const { from, to } = jstTodayRange();
  const liveGames = GAMES.filter((g) => !g.eventsOnly);
  const snapshot = await getSnapshot();

  return Promise.all(
    liveGames.map(async (g) => {
      if (g.liveSource === "startgg") {
        const matches = await getStartggMatches(
          g.slug as StartggGameSlug,
          from,
          to
        ).catch(() => []);
        return { game: g, matches: filterToday(matches, from, to) };
      }
      const fromSnapshot = snapshot?.perGame[g.slug];
      if (fromSnapshot) {
        return { game: g, matches: filterToday(fromSnapshot, from, to) };
      }
      const matches = await getMatches(g.slug, from, to).catch(() => []);
      return { game: g, matches: filterToday(matches, from, to) };
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
  // leagueImageが無いときのフォールバック(そのゲームのロゴ)。
  // 複数タイトル横断のEWC等はnullのまま(色ドットにフォールバック)
  gameLogo: string | null;
  // gameLogo表示時、GameLogo(サイドバーの他のゲーム一覧)と同じ基準で
  // game-logo-auto(ライトモードでの色反転)を適用するかどうか
  gameLogoFixedColor?: boolean;
  tier: string;
  stageName: string;
  url: string;
}

// tierが低くても「開催中の大会」に必ず出す世界大会クラスの大会名パターン。
// PandaScoreのtier付けは大会によって粒度がまちまちで、VALORANT Game Changers
// Championshipのような国際大会でも tier s/a が付かないことがあるため
// (2026-10-23対応)。大会名(league名+serie名+tournament名)のどこかに
// マッチすれば採用する。新しいパターンを増やしたいときはここに1行足すだけでよい
const MAJOR_EVENT_NAME_PATTERNS: RegExp[] = [
  /champions(?:hip)?/i, // "Champions", "Championship", "Game Changers Championship" 等
  /masters/i,
  /worlds/i,
  /\bmsi\b/i,
  /major/i,
];

function isMajorEventName(t: { league: { name: string }; serie: { full_name: string | null }; name: string }): boolean {
  const text = `${t.league.name} ${t.serie.full_name ?? ""} ${t.name}`;
  return MAJOR_EVENT_NAME_PATTERNS.some((p) => p.test(text));
}

// tier・大会名のどちらの自動判定にも引っかからない大会を、大会ID(serie_id、
// イベントページURL /[game]/event/[id] の末尾の数字)と開催期間を指定して
// 強制的に「開催中の大会」に含めるための一覧(開催中のPandaScoreデータに
// serie自体が存在する前提。表示名はそちらから取る)。
// 使い方: 該当大会のserie_idと期間を1行足すだけでよい
const MANUAL_RUNNING_SERIE_IDS: { serieId: number; start: string; end: string }[] = [
  // 例: { serieId: 12345, start: "2026-10-22", end: "2026-11-01" },
];

// PandaScoreの1シリーズにまとまらない特別イベント(EWCのような複数タイトル
// 横断の大会)を、開催期間中だけ手動で差し込むための配列。
// 新しいイベントを追加したいときはここに1行足すだけでよい
const MANUAL_RUNNING_HIGHLIGHTS: {
  start: string;
  end: string;
  label: string;
  stageName: string;
  url: string;
  image: string | null;
}[] = [
  {
    start: EWC_START,
    end: EWC_END,
    label: "Esports World Cup",
    stageName: "複数タイトル横断",
    url: "/ewc",
    image: null,
  },
  {
    start: WORLDS_START,
    end: WORLDS_END,
    label: "Worlds 2026",
    stageName: "日本時間の日程まとめ",
    url: "/worlds",
    image: WORLDS_LEAGUE_IMAGE,
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
    leagueImage: h.image,
    gameLogo: null,
    tier: "s",
    stageName: h.stageName,
    url: h.url,
  }));
  const manualUrls = new Set(manual.map((m) => m.url));

  // Cronスナップショットから読む(無ければ直接取得にフォールバック)。
  // /tournaments/runningもリクエストのたびに叩くと無料枠を消費するため
  const snapshot = await getSnapshot();
  const raw = snapshot?.runningTournaments ?? (await getRunningTournaments());
  const bySerie = new Map<number, (typeof raw)[number]>();
  for (const t of raw) {
    if (!t.serie || !getGame(t.videogame.slug)) continue; // 未対応タイトルは除外
    const existing = bySerie.get(t.serie.id);
    if (!existing || (t.begin_at ?? "") > (existing.begin_at ?? "")) {
      bySerie.set(t.serie.id, t);
    }
  }

  const manualOverrideIds = new Set(
    MANUAL_RUNNING_SERIE_IDS.filter((o) => todayStr >= o.start && todayStr <= o.end).map(
      (o) => o.serieId
    )
  );
  // tier s/a、世界大会クラスの大会名、手動追加のいずれかに当てはまる大会だけ採用する
  // (tierの絞り込みをAPI側でしなくなった分、ここでまとめて行う)
  const qualifies = (t: (typeof raw)[number]) => {
    const tier = (t.tier ?? "").toLowerCase();
    if (tier === "s" || tier === "a") return true;
    if (manualOverrideIds.has(t.serie.id)) return true;
    return isMajorEventName(t);
  };
  // 強制採用枠(大会名マッチ・手動追加)はtier無指定でも埋もれないよう、
  // tier aと同等以上の優先度で並べる
  const tierRank = (t: (typeof raw)[number]) => {
    if (t.tier === "s") return 0;
    if (manualOverrideIds.has(t.serie.id) || isMajorEventName(t)) return 0.5;
    if (t.tier === "a") return 1;
    return 2;
  };
  const fromApi: RunningSerie[] = [...bySerie.values()]
    .filter(qualifies)
    .sort((a, b) => tierRank(a) - tierRank(b))
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
        gameLogo: game.logo ?? null,
        gameLogoFixedColor: game.logoFixedColor,
        tier: t.tier ?? "",
        stageName: t.name,
        url,
      };
    })
    .filter((s) => !manualUrls.has(s.url));

  return [...manual, ...fromApi].slice(0, 6);
}
