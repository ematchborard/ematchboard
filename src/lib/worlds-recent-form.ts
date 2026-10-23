import { edgeCachePut } from "./edge-cache";
import { RECENT_FORM_TTL_SEC, recentFormCacheKey } from "./pandascore";
import type { WorldsSnapshot } from "./worlds-snapshot";
import type { Match } from "./types";

// Worlds出場チームの直近成績(getTeamRecentMatches、lib/pandascore.tsと同じ
// キャッシュキー/TTL)をCronで1時間おきにまとめて温めておく。試合ページ側は
// (Cronが先に書いていれば)PandaScoreを一切呼ばずに済む。
// チームIDはworlds-snapshot.tsが既に取得済みのtournaments/matchesから集める
// (このためだけの追加のPandaScore呼び出しは発生しない)。
//
// 2026-10-24、このジョブを追加した直後に本番でCloudflare Workerの
// CPU/リソース制限超過(503 error 1102)が断続的に発生した。原因は
// custom-worker.ts側でscheduled()が発火元のcron式を見ずに全ジョブを無条件
// 実行していたため、新設した毎時0分のtriggerが既存の5分おきtriggerの
// 0分ぶんと重なり、毎時0分だけ全クロンジョブが二重に同時実行されていたこと
// (custom-worker.tsのコメント参照)。再発防止のため、こちらも17チーム分を
// 一度に並列実行せず小分けにして瞬間的な負荷を抑えている

const API_BASE = "https://api.pandascore.co";
const CHUNK_SIZE = 5;

export function extractWorldsTeamIds(snapshot: WorldsSnapshot): number[] {
  const ids = new Set<number>();
  for (const t of snapshot.tournaments) {
    for (const team of t.teams ?? []) ids.add(team.id);
  }
  for (const m of snapshot.matches) {
    for (const o of m.opponents) {
      if (o.opponent) ids.add(o.opponent.id);
    }
  }
  return [...ids];
}

async function refreshOneTeam(token: string, teamId: number): Promise<void> {
  const params = new URLSearchParams({
    "filter[opponent_id]": String(teamId),
    sort: "-begin_at",
    per_page: "30",
  });
  const url = `${API_BASE}/matches/past?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    console.log(
      `[cron][pandascore] ${res.status} matches/past opponent_id=${teamId} remaining=${res.headers.get("x-rate-limit-remaining") ?? "?"}`
    );
    if (!res.ok) return;
    const matches = (await res.json()) as Match[];
    await edgeCachePut(recentFormCacheKey(teamId), JSON.stringify(matches), RECENT_FORM_TTL_SEC);
  } catch (err) {
    console.error(`[cron][worlds-recent-form] failed for team ${teamId}:`, err);
  }
}

// CHUNK_SIZEずつ順番に処理する(全チーム同時並列だと1回のscheduled()呼び出し
// 内の瞬間的なCPU負荷が大きくなりすぎるため)
export async function refreshWorldsRecentForm(token: string, teamIds: number[]): Promise<void> {
  for (let i = 0; i < teamIds.length; i += CHUNK_SIZE) {
    const chunk = teamIds.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map((teamId) => refreshOneTeam(token, teamId)));
  }
}
