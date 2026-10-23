/// <reference types="@cloudflare/workers-types" />
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import { edgeCacheGet, edgeCachePut } from "./edge-cache";
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

// 上流のHTTPステータスを保持するエラー。404(本当に存在しない)と429/5xx等
// (一時的な障害)を呼び出し側で区別するために使う — 後者をnotFound()にしてしまうと
// Googlebotが「ページが消えた」と判断してインデックスから外してしまうため
// (2026-10-22、枠切れ中に試合/チーム/大会ページが軒並み404化する不具合への対応)
export class PandaScoreError extends Error {
  status: number;
  constructor(status: number, path: string) {
    super(`PandaScore error ${status} for ${path}`);
    this.status = status;
  }
}

// 単発リソース取得(試合/チーム/大会の詳細)の結果。not_found = 上流が本当に404、
// unavailable = 一時的な取得失敗(キャッシュも無い)。両者を呼び出し側(ページ)で
// 区別し、not_foundだけ本物の404を返す
export type SingleFetchResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "not_found" }
  | { kind: "unavailable" };

function classifyFailure(err: unknown): "not_found" | "unavailable" {
  return err instanceof PandaScoreError && err.status === 404 ? "not_found" : "unavailable";
}

// 3層キャッシュ戦略(無料枠1,000req/時を守る生命線):
//  1. プロセス内メモリ(5分) — 同一インスタンス内の連続アクセス用
//  2. Cloudflare Cache API(caches.default、5分) — 拠点ごとに別物だが、KVと違い
//     書き込み回数の上限が無い。個々の試合/チーム/大会詳細のような単発リソースは
//     拠点ごとにキャッシュがばらけても、その拠点だけが軽く再フェッチするだけで
//     自己修復するため実害が小さい(「今日の全ゲーム分」のような集約データとは
//     性質が違う — そちらは引き続きKVのスナップショットを使う。lib/today-snapshot.ts
//     ・lib/worlds-snapshot.ts参照)。
//     2026-10-22、終わった試合ページへのGooglebotの巡回でKVの書き込み上限
//     (1,000回/日)を使い切り、Cronのスナップショット更新まで共倒れした不具合を
//     受けて、この層をKVからCache APIに戻した(KVは以後Cron専用)。
//  3. 上流が429等で失敗したら、まずプロセス内の期限切れキャッシュ、無ければ
//     Cache APIの「古いデータでも可」バックアップ(stale:プレフィックス、TTL24時間)
//     を返す。これで上流が長時間落ちても空表示にはならない。
const memCache = new Map<string, { expires: number; data: unknown; raw: string }>();
const MEM_TTL_MS = 5 * 60_000;
const EDGE_TTL_SEC = 300;
const STALE_TTL_SEC = 24 * 60 * 60; // 上流障害時の最終手段。24時間は古くても空よりマシ

// today-snapshot.ts/worlds-snapshot.tsがCronのスナップショットを読み書きするのに
// 使う共通アクセサ。この層(fetchByUrl)自体はもうKVを使わない
export async function kvCache(): Promise<KVNamespace | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as { MATCH_CACHE?: KVNamespace }).MATCH_CACHE;
  } catch {
    // ローカル開発(next dev)等、Cloudflareコンテキストが無い環境では無視
    return undefined;
  }
}

// 上流フェッチが失敗したときの最終手段。プロセス内の期限切れキャッシュ(速いが
// isolateローカル)→ Cache APIの古いデータバックアップの順
async function readStale<T>(staleKey: string, hit: { data: unknown } | undefined): Promise<T | null> {
  if (hit) return hit.data as T;
  return edgeCacheGet<T>(staleKey);
}

function psFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${query ? `?${query}` : ""}`;
  return fetchByUrl(url, path) as Promise<T>;
}

// URL文字列だけをキーにリクエスト単位でメモ化(React cache)。generateMetadataと
// ページ本体が同じデータを並行して要求するケース(例: 試合詳細ページがgetMatch(id)を
// 2回呼ぶ)で、どちらも先発のPromiseを共有して上流への重複フェッチを防ぐ
// (2026-10-21、ボットの巡回で/matches/{id}が1リクエストにつき2回飛んでいた不具合への対応)。
// psFetch自体ではなくURL文字列だけをキーにする独立関数にしているのは、Reactのcache()は
// オブジェクト引数を参照一致でしか見ないため(paramsは呼び出しごとに新しいオブジェクトなので
// そのままだとキャッシュが効かない)。モジュール読み込み時に1回だけcache()するよう
// トップレベルで定義すること(呼び出しのたびに作るとキャッシュの意味が無くなる)
const fetchByUrl = cache(async (url: string, path: string): Promise<unknown> => {
  const staleKey = `stale:${url}`;

  const hit = memCache.get(url);
  if (hit && hit.expires > Date.now()) return hit.data;

  // Cache API(拠点ローカル、書き込み上限なし)
  const cached = await edgeCacheGet<unknown>(url);
  if (cached !== null) {
    memCache.set(url, { expires: Date.now() + MEM_TTL_MS, data: cached, raw: JSON.stringify(cached) });
    return cached;
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
    const stale = await readStale<unknown>(staleKey, hit);
    if (stale !== null) return stale;
    throw err;
  }

  console.log(
    `[pandascore] ${res.status} ${path} remaining=${res.headers.get("x-rate-limit-remaining") ?? "?"}`
  );

  if (!res.ok) {
    const stale = await readStale<unknown>(staleKey, hit);
    if (stale !== null) return stale;
    throw new PandaScoreError(res.status, path);
  }
  const data: unknown = await res.json();
  const raw = JSON.stringify(data);

  memCache.set(url, { expires: Date.now() + MEM_TTL_MS, data, raw });
  if (memCache.size > 500) {
    for (const [k, v] of memCache) {
      if (v.expires < Date.now()) memCache.delete(k);
    }
  }

  // Cache APIは書き込み回数の上限が無いので、KVのような間引きは不要
  await Promise.all([
    edgeCachePut(url, raw, EDGE_TTL_SEC),
    edgeCachePut(staleKey, raw, STALE_TTL_SEC),
  ]);
  return data;
});

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

export async function getTournament(id: number): Promise<SingleFetchResult<Tournament>> {
  if (!hasApiToken()) {
    const mock = mockTournament(id);
    return mock ? { kind: "ok", data: mock } : { kind: "not_found" };
  }
  try {
    return { kind: "ok", data: await psFetch<Tournament>(`/tournaments/${id}`) };
  } catch (err) {
    return { kind: classifyFailure(err) };
  }
}

// ゲームをまたいで開催中(tier s/a)の大会を横断取得(ホームのビッグマッチ/
// サイドバーの「開催中の大会」用)。PandaScoreの/tournaments/runningは
// 全タイトル共通のエンドポイント(ゲームごとに叩く必要がない)
export interface RunningTournament extends Tournament {
  videogame: { id: number; name: string; slug: string };
}

export async function getRunningTournaments(): Promise<RunningTournament[]> {
  if (!hasApiToken()) return [];
  try {
    // tierでの絞り込みはしない(2026-10-23、VALORANT Game Changers
    // Championshipのような国際大会がPandaScore側で低いtierのまま
    // 「開催中の大会」に出てこない不具合への対応)。tier/大会名での
    // 絞り込みはfeatured.tsのgetRunningSeries側でまとめて行う
    return await psFetch<RunningTournament[]>("/tournaments/running", {
      per_page: "100",
    });
  } catch {
    return [];
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
const FINISHED_MATCH_TTL_SEC = 7 * 24 * 60 * 60; // 終了済み試合は結果が変わらないので長めに
// Cache APIのキーはURL形状である必要があるため、実在しない内部用ホストを使う
// (実際にネットワークへは出ない。あくまでキャッシュのキーとしてのみ使用)
const finishedMatchCacheKey = (id: number) => `https://edge-cache.internal/match-detail-finished/${id}`;

// 終了済み試合はpsFetchの通常キャッシュ(5分)より長い専用キャッシュを先に見る。
// ボットが古い試合詳細ページを繰り返し巡回してくるケースで、2回目以降は
// PandaScoreに一切問い合わせずに返せるようにするため(2026-10-21対応。
// 2026-10-22、KVの書き込み上限を守るためCache APIへ移行)
export async function getMatch(id: number): Promise<SingleFetchResult<MatchDetail>> {
  if (!hasApiToken()) {
    const mock = mockMatchDetail(id);
    return mock ? { kind: "ok", data: mock } : { kind: "not_found" };
  }

  const cached = await edgeCacheGet<MatchDetail>(finishedMatchCacheKey(id));
  if (cached) return { kind: "ok", data: cached };

  try {
    const match = await psFetch<MatchDetail>(`/matches/${id}`);
    if (match.status === "finished") {
      await edgeCachePut(finishedMatchCacheKey(id), JSON.stringify(match), FINISHED_MATCH_TTL_SEC);
    }
    return { kind: "ok", data: match };
  } catch (err) {
    return { kind: classifyFailure(err) };
  }
}

// 試合ページ単位ではなくチームID単位でCache APIに6時間キャッシュする。
// どの試合ページ(同じチームが絡む全試合)からも同じキャッシュを使うので、
// 実質「チームごとにPandaScoreへは6時間に1回」になる。Worlds出場チームは
// 加えてCronで1時間おきに温めておく(lib/worlds-recent-form.ts)ので、
// 試合ページ側がPandaScoreを直接呼ぶのは基本的に非Worldsチームだけになる。
// 2026-10-21に「終了から48時間経った試合はそもそも取得しない」対応をしたが
// Recent formが出せなくなっていたため、2026-10-24にこちらへ置き換えた
export const RECENT_FORM_TTL_SEC = 6 * 60 * 60;
export const recentFormCacheKey = (teamId: number) =>
  `https://edge-cache.internal/team-recent-matches/${teamId}`;

// 戻り値がnull = 取得失敗(呼び出し側で欄ごと非表示にする)。
// 空配列 = 取得は成功したが直近の試合が無い、という区別
export async function getTeamRecentMatches(id: number): Promise<Match[] | null> {
  if (!hasApiToken()) return mockTeamMatches(id).past;

  const cached = await edgeCacheGet<Match[]>(recentFormCacheKey(id));
  if (cached) return cached;

  try {
    const matches = await psFetch<Match[]>(`/matches/past`, {
      "filter[opponent_id]": String(id),
      sort: "-begin_at",
      per_page: "30",
    });
    await edgeCachePut(recentFormCacheKey(id), JSON.stringify(matches), RECENT_FORM_TTL_SEC);
    return matches;
  } catch {
    return null;
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

export async function getTeam(id: number): Promise<SingleFetchResult<TeamDetail>> {
  if (!hasApiToken()) {
    const mock = mockTeam(id);
    return mock ? { kind: "ok", data: mock } : { kind: "not_found" };
  }
  try {
    return { kind: "ok", data: await psFetch<TeamDetail>(`/teams/${id}`) };
  } catch (err) {
    return { kind: classifyFailure(err) };
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
