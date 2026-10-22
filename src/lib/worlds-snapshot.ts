/// <reference types="@cloudflare/workers-types" />
import type { Match, Serie, Tournament } from "./types";
import { WORLDS_SERIE_ID } from "./worlds";

// /worlds ページの表示データ(series・tournaments・matches)をCronが1つのKVキーに
// まとめて書き込み、ページ側はそれを読むだけにする。today-snapshot.tsと全く同じ
// 設計(失敗した項目は前回値を残す、全滅なら書き込み自体をスキップ)。
// Worldsは1シリーズだけなのでCron1回あたりの呼び出しは3回で済む
// (/series/:id, /series/:id/tournaments, /series/:id/matches×最大3ページ)。
// 2026-10-22、大会期間中に/worldsがPandaScoreの429で断続的に空表示になる
// 不具合への対応として導入

export const WORLDS_SNAPSHOT_KEY = "worlds-snapshot:v1";
const API_BASE = "https://api.pandascore.co";

export interface WorldsSnapshot {
  generatedAt: string;
  serie: Serie | null;
  tournaments: Tournament[];
  matches: Match[];
}

interface BuildWorldsSnapshotResult {
  snapshot: WorldsSnapshot;
  // 取得に失敗した項目(前回値を残すため)。空取得("今は0件"等)とは区別する
  failed: { serie: boolean; tournaments: boolean; matches: boolean };
}

async function fetchJson<T>(url: string, token: string): Promise<{ data: T | null; ok: boolean }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch (err) {
    console.error(`[cron][worlds] fetch failed: ${url}`, err);
    return { data: null, ok: false };
  }
  console.log(
    `[cron][pandascore] ${res.status} ${url.replace(API_BASE, "")} remaining=${res.headers.get("x-rate-limit-remaining") ?? "?"}`
  );
  if (!res.ok) return { data: null, ok: false };
  return { data: (await res.json()) as T, ok: true };
}

async function fetchAllMatches(token: string): Promise<{ matches: Match[]; ok: boolean }> {
  const all: Match[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `${API_BASE}/series/${WORLDS_SERIE_ID}/matches?sort=begin_at&per_page=100&page=${page}`;
    const { data, ok } = await fetchJson<Match[]>(url, token);
    if (!ok || !data) return { matches: all, ok: page > 1 }; // 1ページ目から失敗なら完全失敗
    all.push(...data);
    if (data.length < 100) break;
  }
  return { matches: all, ok: true };
}

// Cronの scheduled() からのみ呼ぶ。psFetchは通さず直接PandaScoreを叩く
// (today-snapshot.tsのbuildTodaySnapshotと同じ理由: psFetch側の個別URL
// キャッシュに二重書き込みしてKV書き込み無料枠を余計に消費しないため)
export async function buildWorldsSnapshot(token: string): Promise<BuildWorldsSnapshotResult> {
  const [serieRes, tournamentsRes, matchesRes] = await Promise.all([
    fetchJson<Serie>(`${API_BASE}/series/${WORLDS_SERIE_ID}`, token),
    fetchJson<Tournament[]>(
      `${API_BASE}/series/${WORLDS_SERIE_ID}/tournaments?per_page=50`,
      token
    ),
    fetchAllMatches(token),
  ]);

  return {
    snapshot: {
      generatedAt: new Date().toISOString(),
      serie: serieRes.data,
      tournaments: tournamentsRes.data ?? [],
      matches: matchesRes.matches,
    },
    failed: {
      serie: !serieRes.ok,
      tournaments: !tournamentsRes.ok,
      matches: !matchesRes.ok,
    },
  };
}

export async function readWorldsSnapshot(
  kv: KVNamespace | undefined
): Promise<WorldsSnapshot | null> {
  if (!kv) return null;
  try {
    return await kv.get<WorldsSnapshot>(WORLDS_SNAPSHOT_KEY, "json");
  } catch {
    return null;
  }
}

// 失敗した項目だけ前回のスナップショットの値で埋める。全部失敗したときは
// 書き込み自体をスキップして前回のデータをそのまま残す
export async function writeWorldsSnapshot(
  kv: KVNamespace,
  result: BuildWorldsSnapshotResult
): Promise<{ written: boolean; keptFromPrevious: string[] }> {
  const { snapshot, failed } = result;

  if (failed.serie && failed.tournaments && failed.matches) {
    return { written: false, keptFromPrevious: [] };
  }

  const keptFromPrevious: string[] = [];
  if (failed.serie || failed.tournaments || failed.matches) {
    const previous = await readWorldsSnapshot(kv);
    if (previous) {
      if (failed.serie && previous.serie) {
        snapshot.serie = previous.serie;
        keptFromPrevious.push("serie");
      }
      if (failed.tournaments && previous.tournaments.length > 0) {
        snapshot.tournaments = previous.tournaments;
        keptFromPrevious.push("tournaments");
      }
      if (failed.matches && previous.matches.length > 0) {
        snapshot.matches = previous.matches;
        keptFromPrevious.push("matches");
      }
    }
  }

  // 次のCronが来なくても1時間で自動失効(古すぎるデータで止まるのを防ぐ)。
  // 大会期間中は5分おきのCronで常に更新されるはず
  await kv.put(WORLDS_SNAPSHOT_KEY, JSON.stringify(snapshot), { expirationTtl: 60 * 60 });
  return { written: true, keptFromPrevious };
}
