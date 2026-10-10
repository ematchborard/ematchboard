/// <reference types="@cloudflare/workers-types" />
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  BracketMatch,
  Match,
  MatchDetail,
  Serie,
  Standing,
  TeamDetail,
  Tournament,
} from "./types";
import {
  mockMatchDetail,
  mockMatches,
  mockSerie,
  mockSerieMatches,
  mockSerieTournaments,
  mockTeam,
  mockTeamMatches,
  mockTournament,
  mockTournamentMatches,
} from "./mock";

// PandaScore クライアント。トークンはサーバー側の環境変数からのみ読む
// (ブラウザに漏れると無料枠を他人に消費されるため、クライアントには絶対に渡さない)。
// トークン未設定ならモックデータにフォールバックするので、キーなしでも開発できる。

const API_BASE = "https://api.pandascore.co";

export function hasApiToken(): boolean {
  return Boolean(process.env.PANDASCORE_TOKEN);
}

// 3層キャッシュ戦略(無料枠1,000req/時を守る生命線):
//  1. プロセス内メモリ(5分) — 同一インスタンス内の連続アクセス用
//  2. Cloudflare KV(5分) — 拠点をまたいで共有される(KVの由来)。
//     以前はcaches.default(Cache API)を使っていたが、これは**拠点ごとに別物**で
//     グローバル共有ではないため、アクセスの少ない拠点(海外等)は毎回キャッシュが
//     空の状態から上流に生アクセスし、そこで失敗すると救えず空表示になっていた
//     (2026-10-11、海外アクセスで試合0件になる不具合として発覚)。KVは拠点間で
//     数十秒程度のラグはあるが共有されるため、この問題を構造的に解消する。
//  3. 上流が429等で失敗したら、期限切れのメモリキャッシュでも返す(空表示より古いデータ)
const memCache = new Map<string, { expires: number; data: unknown }>();
const MEM_TTL_MS = 5 * 60_000;
const KV_TTL_SEC = 300;

async function kvCache(): Promise<KVNamespace | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as { MATCH_CACHE?: KVNamespace }).MATCH_CACHE;
  } catch {
    // ローカル開発(next dev)等、Cloudflareコンテキストが無い環境では無視
    return undefined;
  }
}

async function psFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${query ? `?${query}` : ""}`;

  const hit = memCache.get(url);
  if (hit && hit.expires > Date.now()) return hit.data as T;

  // KVキャッシュ(URLのみがキーで、トークンは含まれないので安全)
  const kv = await kvCache();
  if (kv) {
    try {
      const cached = await kv.get<T>(url, "json");
      if (cached !== null) {
        memCache.set(url, { expires: Date.now() + MEM_TTL_MS, data: cached });
        return cached;
      }
    } catch {
      // KV読み取り失敗は無視して上流へ
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.PANDASCORE_TOKEN}`,
        Accept: "application/json",
      },
      // Node/Vercel環境ではこれが5分キャッシュとして効く
      next: { revalidate: 300 },
    });
  } catch (err) {
    if (hit) return hit.data as T; // 通信失敗: 期限切れキャッシュで凌ぐ
    throw err;
  }
  if (!res.ok) {
    if (hit) return hit.data as T; // レート制限(429)等: 同上
    throw new Error(`PandaScore error ${res.status} for ${path}`);
  }
  const data = (await res.json()) as T;

  memCache.set(url, { expires: Date.now() + MEM_TTL_MS, data });
  if (memCache.size > 500) {
    for (const [k, v] of memCache) {
      if (v.expires < Date.now()) memCache.delete(k);
    }
  }
  if (kv) {
    try {
      await kv.put(url, JSON.stringify(data), {
        expirationTtl: KV_TTL_SEC,
      });
    } catch {
      // キャッシュ保存失敗は無視(次回また上流から取る)
    }
  }
  return data;
}

export async function getMatches(
  gameSlug: string,
  from: Date,
  to: Date
): Promise<Match[]> {
  if (!hasApiToken()) {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return mockMatches(gameSlug).filter((m) => {
      const t = m.begin_at ? Date.parse(m.begin_at) : NaN;
      return t >= fromMs && t <= toMs;
    });
  }
  // 月表示など期間が長いと100件を超えるのでページを追う(最大5ページ=500件)。
  // 1ページでも失敗したら、それまでに集めた分だけ返す(例外を外に投げない)。
  // caches.defaultはCloudflareの拠点ごとに別物なので、まだ温まってない拠点
  // (海外からのアクセス等)ではキャッシュに頼れず上流への生アクセスが起きやすく、
  // そこで失敗すると呼び出し元が軒並み「空=試合無し」と誤認してしまうため、
  // ここで失敗を記録しておく(Cloudflareの Observability > Logs で追える)。
  const all: Match[] = [];
  for (let page = 1; page <= 5; page++) {
    let batch: Match[];
    try {
      batch = await psFetch<Match[]>(`/${gameSlug}/matches`, {
        "range[begin_at]": `${from.toISOString()},${to.toISOString()}`,
        sort: "begin_at",
        per_page: "100",
        page: String(page),
      });
    } catch (err) {
      console.error(`getMatches(${gameSlug}) page ${page} failed:`, err);
      break;
    }
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function getTournament(id: number): Promise<Tournament | null> {
  if (!hasApiToken()) return mockTournament(id);
  try {
    return await psFetch<Tournament>(`/tournaments/${id}`);
  } catch {
    return null;
  }
}

export async function getTournamentMatches(id: number): Promise<Match[]> {
  if (!hasApiToken()) return mockTournamentMatches(id);
  try {
    return await psFetch<Match[]>(`/tournaments/${id}/matches`, {
      sort: "begin_at",
      per_page: "100",
    });
  } catch {
    return [];
  }
}

// リーグ戦形式の大会のみ順位表が返る。無い形式(トーナメント表のみ等)は null
export async function getTournamentStandings(
  id: number
): Promise<Standing[] | null> {
  if (!hasApiToken()) return null;
  try {
    const standings = await psFetch<Standing[]>(
      `/tournaments/${id}/standings`,
      { per_page: "50" }
    );
    return standings.length > 0 ? standings : null;
  } catch {
    return null;
  }
}

// 試合詳細 (マップごとの結果を含む)
export async function getMatch(id: number): Promise<MatchDetail | null> {
  if (!hasApiToken()) return mockMatchDetail(id);
  try {
    return await psFetch<MatchDetail>(`/matches/${id}`);
  } catch {
    return null;
  }
}

// チームの直近の過去試合 (フォーム表示・過去対戦成績の計算用)
export async function getTeamRecentMatches(id: number): Promise<Match[]> {
  if (!hasApiToken()) return mockTeamMatches(id).past;
  try {
    return await psFetch<Match[]>(`/matches/past`, {
      "filter[opponent_id]": String(id),
      sort: "-begin_at",
      per_page: "30",
    });
  } catch {
    return [];
  }
}

// シリーズ = 大会の1開催全体 (EWC 2026 など)
export async function getSerie(id: number): Promise<Serie | null> {
  if (!hasApiToken()) return mockSerie(id);
  try {
    return await psFetch<Serie>(`/series/${id}`);
  } catch {
    return null;
  }
}

// シリーズ配下のステージ一覧 (Group A / Group B / Playoffs など)
export async function getSerieTournaments(id: number): Promise<Tournament[]> {
  if (!hasApiToken()) return mockSerieTournaments(id);
  try {
    return await psFetch<Tournament[]>(`/series/${id}/tournaments`, {
      per_page: "50",
    });
  } catch {
    return [];
  }
}

// シリーズ全体の全試合 (全ステージ横断)
export async function getSerieMatches(id: number): Promise<Match[]> {
  if (!hasApiToken()) return mockSerieMatches(id);
  const all: Match[] = [];
  for (let page = 1; page <= 3; page++) {
    let batch: Match[];
    try {
      batch = await psFetch<Match[]>(`/series/${id}/matches`, {
        sort: "begin_at",
        per_page: "100",
        page: String(page),
      });
    } catch {
      break;
    }
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

// ブラケット(トーナメント表)構造。勝ち上がり関係が無い=リーグ形式なら null を返し、
// 大会ページ側でセクションごと非表示にする
export async function getTournamentBrackets(
  id: number
): Promise<BracketMatch[] | null> {
  if (!hasApiToken()) return null;
  try {
    const brackets = await psFetch<BracketMatch[]>(
      `/tournaments/${id}/brackets`,
      { per_page: "100" }
    );
    const hasLinks = brackets.some((b) => (b.previous_matches ?? []).length > 0);
    return hasLinks ? brackets : null;
  } catch {
    return null;
  }
}

export async function getTeam(id: number): Promise<TeamDetail | null> {
  if (!hasApiToken()) return mockTeam(id);
  try {
    return await psFetch<TeamDetail>(`/teams/${id}`);
  } catch {
    return null;
  }
}

export async function getTeamMatches(
  id: number
): Promise<{ upcoming: Match[]; past: Match[] }> {
  if (!hasApiToken()) return mockTeamMatches(id);
  const opponentFilter = { "filter[opponent_id]": String(id) };
  const safe = (p: Promise<Match[]>) => p.catch(() => [] as Match[]);
  const [running, upcoming, past] = await Promise.all([
    safe(psFetch<Match[]>("/matches/running", { ...opponentFilter, per_page: "5" })),
    safe(psFetch<Match[]>("/matches/upcoming", { ...opponentFilter, sort: "begin_at", per_page: "5" })),
    safe(psFetch<Match[]>("/matches/past", { ...opponentFilter, sort: "-begin_at", per_page: "5" })),
  ]);
  return { upcoming: [...running, ...upcoming], past };
}
