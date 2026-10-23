import { edgeCachePut } from "./edge-cache";
import { RECENT_FORM_TTL_SEC, recentFormCacheKey } from "./pandascore";
import type { WorldsSnapshot } from "./worlds-snapshot";
import type { Match } from "./types";

// Worlds出場チームの直近成績(getTeamRecentMatches、lib/pandascore.tsと同じ
// キャッシュキー/TTL)をCronで1時間おきにまとめて温めておく。試合ページ側は
// (Cronが先に書いていれば)PandaScoreを一切呼ばずに済む。
// チームIDはworlds-snapshot.tsが既に取得済みのtournaments/matchesから集める
// (このためだけの追加のPandaScore呼び出しは発生しない)。

const API_BASE = "https://api.pandascore.co";

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

export async function refreshWorldsRecentForm(token: string, teamIds: number[]): Promise<void> {
  await Promise.all(
    teamIds.map(async (teamId) => {
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
    })
  );
}
