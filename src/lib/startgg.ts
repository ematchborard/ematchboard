/// <reference types="@cloudflare/workers-types" />
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  Match,
  MatchDetail,
  MatchGame,
  MatchStatus,
  Serie,
  Team,
  TeamDetail,
  Tournament,
} from "./types";

// start.gg (旧smash.gg) の非公式ではない公式GraphQL API。格闘ゲーム/スマブラ界隈の
// 大会は実質ここ一択で運営されているが、逆に言うと世界中の弱小ローカル大会も
// 同じAPIに全部乗っている。videogameId だけで絞ると大会名リンク先が
// 弱小大会だらけになってしまうため、PandaScoreのような「対応タイトルなら
// 何でも自動で拾う」方式ではなく、本当に注目度の高い大会だけを
// MAJOR_SERIES に手動で登録し、その大会の日程・結果・出場者だけを
// APIから自動取得する方式にしている。
//
// 新しいメジャー大会を追加したいときは、start.ggで大会ページを検索して
// tournament id と(必要な種目の) event id を調べ、MAJOR_SERIES に1行足すだけでよい。

const API_URL = "https://api.start.gg/gql/alpha";

export function hasStartggToken(): boolean {
  return Boolean(process.env.STARTGG_TOKEN);
}

export type StartggGameSlug = "smash" | "sf6";

interface MajorSeries {
  tournamentId: number;
  eventId: number;
  gameSlug: StartggGameSlug;
  // 系列名(年をまたいで同じ値にする=グループ化・ロゴの一貫性のため)
  leagueLabel: string;
}

const MAJOR_SERIES: MajorSeries[] = [
  {
    tournamentId: 907677,
    eventId: 1616628,
    gameSlug: "smash",
    leagueLabel: "GENESIS",
  },
  {
    tournamentId: 851461,
    eventId: 1503441,
    gameSlug: "smash",
    leagueLabel: "Riptide",
  },
  {
    tournamentId: 919272,
    eventId: 1640093,
    gameSlug: "sf6",
    leagueLabel: "Esports World Cup",
  },
];

// start.ggの大会名には既に系列名が含まれていることが多く(例: "Esports World Cup
// 2026: Street Fighter 6 - LCQ")、league.name(系列名)と serie.full_name(大会名)
// を並べて表示するUIだと "Esports World Cup Esports World Cup 2026: ..." と
// 重複してしまう。先頭が系列名と一致する場合はそこを取り除く
function stripLeaguePrefix(name: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = name
    .replace(new RegExp(`^${escaped}[:\\s-]*`, "i"), "")
    .trim();
  return stripped || name;
}

// 系列名から安定した数値IDを作る(大会自体のidは年ごとに変わるが、
// グループ化用のleague.idは同じ系列なら毎年同じ値になってほしいため)
function stableId(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// 3層キャッシュ戦略(PandaScoreと同じ設計。start.ggのレート制限は
// 80req/60秒とPandaScoreよりタイトなので、キャッシュの意義がより大きい)。
// エッジキャッシュはCloudflare KVを使う(拠点をまたいで共有されるため。
// 以前はcaches.defaultだったが拠点ごとに別物でグローバル共有ではなく、
// 海外アクセスでキャッシュが温まってない拠点が上流失敗を即座に空表示に
// してしまう不具合があった。詳細はpandascore.tsのコメント参照)
const memCache = new Map<string, { expires: number; data: unknown }>();
const MEM_TTL_MS = 5 * 60_000;
const KV_TTL_SEC = 300;

async function kvCache(): Promise<KVNamespace | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as { MATCH_CACHE?: KVNamespace }).MATCH_CACHE;
  } catch {
    return undefined;
  }
}

// KVのキー長上限(512バイト)に収まるよう、クエリ+変数をハッシュ化する
// (生のGraphQLクエリ文をそのままキーにすると長いものが上限を超えるため)
function hashKey(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

async function sgQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const rawKey = `${JSON.stringify(variables)}::${query.replace(/\s+/g, " ").trim()}`;
  const cacheKey = `sg:${hashKey(rawKey)}`;

  const hit = memCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.data as T;

  const kv = await kvCache();
  if (kv) {
    try {
      const cached = await kv.get<T>(cacheKey, "json");
      if (cached !== null) {
        memCache.set(cacheKey, { expires: Date.now() + MEM_TTL_MS, data: cached });
        return cached;
      }
    } catch {
      // KV読み取り失敗は無視して上流へ
    }
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STARTGG_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });
  } catch {
    return hit ? (hit.data as T) : null;
  }
  if (!res.ok) return hit ? (hit.data as T) : null;

  const json = (await res.json()) as {
    data: T;
    errors?: { message: string }[];
  };
  if (json.errors && json.errors.length > 0) {
    return hit ? (hit.data as T) : null;
  }
  const data = json.data;

  memCache.set(cacheKey, { expires: Date.now() + MEM_TTL_MS, data });
  if (memCache.size > 200) {
    for (const [k, v] of memCache) {
      if (v.expires < Date.now()) memCache.delete(k);
    }
  }
  if (kv) {
    try {
      await kv.put(cacheKey, JSON.stringify(data), {
        expirationTtl: KV_TTL_SEC,
      });
    } catch {
      // キャッシュ保存失敗は無視
    }
  }
  return data;
}

function mapState(state: number): MatchStatus {
  if (state === 3) return "finished";
  if (state === 2) return "running";
  return "not_started"; // 1 = created(未開始)、それ以外は未知の状態なので未開始扱い
}

interface RawEntrant {
  id: number;
  name: string;
}

interface RawGame {
  id: number;
  orderNum: number;
  winnerId: number | null;
  stage: { name: string } | null;
}

interface RawSet {
  id: number;
  startAt: number | null;
  state: number;
  fullRoundText: string | null;
  totalGames: number | null;
  winnerId: number | null;
  slots: { entrant: RawEntrant | null }[];
  games?: RawGame[] | null;
}

function toTeam(entrant: RawEntrant | null): Team | null {
  if (!entrant) return null;
  return { id: entrant.id, name: entrant.name, acronym: null, image_url: null };
}

interface MatchContext {
  leagueId: number;
  leagueName: string;
  leagueImage: string | null;
  serieId: number;
  serieName: string;
  tournamentId: number;
  tournamentName: string;
}

function toMatch(set: RawSet, ctx: MatchContext): Match {
  const teamA = toTeam(set.slots[0]?.entrant ?? null);
  const teamB = toTeam(set.slots[1]?.entrant ?? null);
  const opponents = [teamA, teamB]
    .filter((t): t is Team => t !== null)
    .map((opponent) => ({ opponent }));

  // 個別マップの勝敗が取れる大会はそこからスコアを、取れない大会は
  // 勝者1敗者0の簡易スコアにフォールバックする(全ての大会がマップ単位まで
  // 記録しているわけではないため)
  const results: { team_id: number; score: number }[] = [];
  if (set.games && set.games.length > 0) {
    for (const t of [teamA, teamB]) {
      if (!t) continue;
      const wins = set.games.filter((g) => g.winnerId === t.id).length;
      results.push({ team_id: t.id, score: wins });
    }
  } else if (set.winnerId !== null) {
    for (const t of [teamA, teamB]) {
      if (!t) continue;
      results.push({ team_id: t.id, score: t.id === set.winnerId ? 1 : 0 });
    }
  }

  return {
    id: set.id,
    name: set.fullRoundText ?? "",
    status: mapState(set.state),
    begin_at: set.startAt ? new Date(set.startAt * 1000).toISOString() : null,
    number_of_games: set.totalGames ?? 3,
    league: {
      id: ctx.leagueId,
      name: ctx.leagueName,
      image_url: ctx.leagueImage,
    },
    serie: { id: ctx.serieId, full_name: ctx.serieName },
    tournament: { id: ctx.tournamentId, name: ctx.tournamentName },
    opponents,
    results,
    winner_id: set.winnerId,
    streams_list: [],
  };
}

interface TournamentInfo {
  id: number;
  name: string;
  startAt: number | null;
  endAt: number | null;
  image: string | null;
}

async function fetchTournamentInfo(id: number): Promise<TournamentInfo | null> {
  const data = await sgQuery<{
    tournament: {
      id: number;
      name: string;
      startAt: number | null;
      endAt: number | null;
      images: { url: string }[] | null;
    } | null;
  }>(
    `query T($id: ID!) { tournament(id: $id) { id name startAt endAt images(type: "profile") { url } } }`,
    { id },
  );
  const t = data?.tournament;
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    startAt: t.startAt,
    endAt: t.endAt,
    image: t.images?.[0]?.url ?? null,
  };
}

async function fetchEventSets(
  eventId: number,
  perPage = 50,
): Promise<{
  eventName: string;
  sets: RawSet[];
} | null> {
  const data = await sgQuery<{
    event: {
      name: string;
      sets: { nodes: RawSet[] };
    } | null;
  }>(
    `query T($id: ID!, $perPage: Int!) {
      event(id: $id) {
        name
        sets(page: 1, perPage: $perPage, sortType: STANDARD) {
          nodes {
            id
            startAt
            state
            fullRoundText
            totalGames
            winnerId
            slots { entrant { id name } }
          }
        }
      }
    }`,
    { id: eventId, perPage },
  );
  const ev = data?.event;
  if (!ev) return null;
  return { eventName: ev.name, sets: ev.sets.nodes };
}

// ゲーム一覧ページ用: 対象タイトルのメジャー大会シリーズを全部集めてMatch[]にする
export async function getStartggMatches(
  gameSlug: StartggGameSlug,
  from: Date,
  to: Date,
): Promise<Match[]> {
  if (!hasStartggToken()) return [];
  const series = MAJOR_SERIES.filter((s) => s.gameSlug === gameSlug);
  const fromMs = from.getTime();
  const toMs = to.getTime();

  const results = await Promise.all(
    series.map(async (s) => {
      const [info, eventData] = await Promise.all([
        fetchTournamentInfo(s.tournamentId),
        fetchEventSets(s.eventId),
      ]);
      if (!info || !eventData) return [];
      const ctx: MatchContext = {
        leagueId: stableId(s.leagueLabel),
        leagueName: s.leagueLabel,
        leagueImage: info.image,
        serieId: s.tournamentId,
        serieName: stripLeaguePrefix(info.name, s.leagueLabel),
        tournamentId: s.eventId,
        tournamentName: eventData.eventName,
      };
      return eventData.sets.map((set) => toMatch(set, ctx));
    }),
  );

  return results.flat().filter((m) => {
    if (!m.begin_at) return true;
    const t = Date.parse(m.begin_at);
    return t >= fromMs && t <= toMs;
  });
}

// 大会全体ページ用
export async function getStartggSerie(id: number): Promise<Serie | null> {
  const s = MAJOR_SERIES.find((m) => m.tournamentId === id);
  const info = await fetchTournamentInfo(id);
  if (!info) return null;
  return {
    id: info.id,
    full_name: s ? stripLeaguePrefix(info.name, s.leagueLabel) : info.name,
    begin_at: info.startAt ? new Date(info.startAt * 1000).toISOString() : null,
    end_at: info.endAt ? new Date(info.endAt * 1000).toISOString() : null,
    league: {
      id: s ? stableId(s.leagueLabel) : id,
      name: s?.leagueLabel ?? info.name,
      image_url: info.image,
    },
  };
}

// 大会全体ページのステージタブ用(このシリーズには種目=1ステージのみ)
export async function getStartggSerieTournaments(
  id: number,
): Promise<Tournament[]> {
  const s = MAJOR_SERIES.find((m) => m.tournamentId === id);
  if (!s) return [];
  const eventData = await fetchEventSets(s.eventId, 1);
  if (!eventData) return [];
  return [
    {
      id: s.eventId,
      name: eventData.eventName,
      tier: null,
      begin_at: null,
      end_at: null,
      league: {
        id: stableId(s.leagueLabel),
        name: s.leagueLabel,
        image_url: null,
      },
      serie: { id, full_name: null },
    },
  ];
}

// 大会全体ページの試合一覧用
export async function getStartggSerieMatches(id: number): Promise<Match[]> {
  const s = MAJOR_SERIES.find((m) => m.tournamentId === id);
  if (!s) return [];
  const [info, eventData] = await Promise.all([
    fetchTournamentInfo(id),
    // sets(perPage)のクエリ複雑度上限は1000(このクエリ形状だと1件あたり約6)。
    // 130件なら余裕をもって収まる
    fetchEventSets(s.eventId, 130),
  ]);
  if (!info || !eventData) return [];
  const ctx: MatchContext = {
    leagueId: stableId(s.leagueLabel),
    leagueName: s.leagueLabel,
    leagueImage: info.image,
    serieId: s.tournamentId,
    serieName: stripLeaguePrefix(info.name, s.leagueLabel),
    tournamentId: s.eventId,
    tournamentName: eventData.eventName,
  };
  return eventData.sets.map((set) => toMatch(set, ctx));
}

// 試合詳細ページ用。ラインナップ(選手の呼び名/所属)も同じクエリで一緒に取る
export async function getStartggMatch(
  id: number,
): Promise<{
  match: MatchDetail;
  teamA: TeamDetail | null;
  teamB: TeamDetail | null;
} | null> {
  const data = await sgQuery<{
    set: {
      id: number;
      startAt: number | null;
      state: number;
      fullRoundText: string | null;
      totalGames: number | null;
      winnerId: number | null;
      event: {
        id: number;
        name: string;
        tournament: { id: number; name: string };
      } | null;
      games: RawGame[] | null;
      slots: {
        entrant: {
          id: number;
          name: string;
          participants: {
            id: number;
            gamerTag: string;
            prefix: string | null;
            player: { id: number } | null;
          }[];
        } | null;
      }[];
    } | null;
  }>(
    `query T($id: ID!) {
      set(id: $id) {
        id
        startAt
        state
        fullRoundText
        totalGames
        winnerId
        event { id name tournament { id name } }
        games { id orderNum winnerId stage { name } }
        slots {
          entrant {
            id
            name
            participants { id gamerTag prefix player { id } }
          }
        }
      }
    }`,
    { id },
  );

  const raw = data?.set;
  if (!raw || !raw.event) return null;

  const s = MAJOR_SERIES.find((m) => m.eventId === raw.event!.id);
  const ctx: MatchContext = {
    leagueId: s ? stableId(s.leagueLabel) : raw.event.tournament.id,
    leagueName: s?.leagueLabel ?? raw.event.tournament.name,
    leagueImage: null,
    serieId: raw.event.tournament.id,
    serieName: s
      ? stripLeaguePrefix(raw.event.tournament.name, s.leagueLabel)
      : raw.event.tournament.name,
    tournamentId: raw.event.id,
    tournamentName: raw.event.name,
  };

  const rawSet: RawSet = {
    id: raw.id,
    startAt: raw.startAt,
    state: raw.state,
    fullRoundText: raw.fullRoundText,
    totalGames: raw.totalGames,
    winnerId: raw.winnerId,
    slots: raw.slots.map((sl) => ({
      entrant: sl.entrant ? { id: sl.entrant.id, name: sl.entrant.name } : null,
    })),
    games: raw.games ?? undefined,
  };

  const baseMatch = toMatch(rawSet, ctx);
  const games: MatchGame[] = (raw.games ?? []).map((g) => ({
    id: g.id,
    position: g.orderNum,
    status:
      g.winnerId !== null
        ? "finished"
        : baseMatch.status === "finished"
          ? "finished"
          : "not_started",
    winner: { id: g.winnerId },
  }));

  const toTeamDetail = (
    slot: (typeof raw.slots)[number] | undefined,
  ): TeamDetail | null => {
    const e = slot?.entrant;
    if (!e) return null;
    return {
      id: e.id,
      name: e.name,
      acronym: null,
      image_url: null,
      location: null,
      players: e.participants.map((p) => ({
        id: p.id,
        name: p.gamerTag,
        first_name: null,
        last_name: null,
        image_url: null,
        nationality: null,
        role: p.prefix || null,
      })),
    };
  };

  return {
    match: { ...baseMatch, games },
    teamA: toTeamDetail(raw.slots[0]),
    teamB: toTeamDetail(raw.slots[1]),
  };
}
