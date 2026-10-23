/// <reference types="@cloudflare/workers-types" />
import { GAMES } from "./games";
import { jstTodayRange } from "./jst";
import type { RunningTournament } from "./pandascore";
import type { Match } from "./types";

// 「今日(JST)の全ゲーム分の試合」+「開催中(tier s/a)の大会」をCronが1つのKVキーに
// まとめて書き込み、リクエスト処理側(/api/today・ホームの今日のビッグマッチ・
// サイドバーの開催中の大会)はそれを読むだけにする仕組み。以前はリクエストごとに
// (prefetchも含め)ゲームの数だけPandaScoreを叩いていて、アクセス数に比例して
// 無料枠(1,000req/時)を消費していた。Cronなら頻度が固定なので、アクセス数に
// 関係なくPandaScoreへの問い合わせ回数が一定になる(2026-10-21の枯渇を受けて導入)。
// start.gg採用タイトル(Smash/SF6)はPandaScoreと無関係の別APIなので対象外
// (startgg.ts側の既存キャッシュ+stale fallbackで十分)。

export const TODAY_SNAPSHOT_KEY = "today-snapshot:v1";
const API_BASE = "https://api.pandascore.co";

export interface TodaySnapshot {
  generatedAt: string;
  dateJst: string;
  perGame: Record<string, Match[]>;
  runningTournaments: RunningTournament[];
}

interface BuildTodaySnapshotResult {
  snapshot: TodaySnapshot;
  // 取得に失敗した(=空ではなく「分からない」)ゲームslug一覧。空配列の試合0件とは区別する
  failedGames: string[];
  runningTournamentsFailed: boolean;
  totalGames: number;
}

async function fetchGameMatches(
  gameSlug: string,
  from: Date,
  to: Date,
  token: string
): Promise<{ matches: Match[]; ok: boolean }> {
  const all: Match[] = [];
  for (let page = 1; page <= 5; page++) {
    const params = new URLSearchParams({
      "range[begin_at]": `${from.toISOString()},${to.toISOString()}`,
      sort: "begin_at",
      per_page: "100",
      page: String(page),
    });
    const url = `${API_BASE}/${gameSlug}/matches?${params}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch (err) {
      console.error(`[cron] fetch failed ${gameSlug} page ${page}:`, err);
      return { matches: all, ok: page > 1 }; // 1ページ目から失敗なら完全に失敗扱い
    }
    console.log(
      `[cron][pandascore] ${res.status} ${gameSlug}/matches page=${page} remaining=${res.headers.get("x-rate-limit-remaining") ?? "?"}`
    );
    if (!res.ok) return { matches: all, ok: page > 1 };
    const batch = (await res.json()) as Match[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return { matches: all, ok: true };
}

async function fetchRunningTournaments(
  token: string
): Promise<{ tournaments: RunningTournament[]; ok: boolean }> {
  // tierでの絞り込みはしない(lib/pandascore.tsのgetRunningTournamentsと同じ理由)。
  // tier/大会名での絞り込みはfeatured.tsのgetRunningSeries側で行う
  const params = new URLSearchParams({ per_page: "100" });
  const url = `${API_BASE}/tournaments/running?${params}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch (err) {
    console.error("[cron] fetch failed tournaments/running:", err);
    return { tournaments: [], ok: false };
  }
  console.log(
    `[cron][pandascore] ${res.status} tournaments/running remaining=${res.headers.get("x-rate-limit-remaining") ?? "?"}`
  );
  if (!res.ok) return { tournaments: [], ok: false };
  const tournaments = (await res.json()) as RunningTournament[];
  return { tournaments, ok: true };
}

// Cronの scheduled() からのみ呼ぶ。psFetch(リクエスト用の個別URLキャッシュ)は
// 通さず直接PandaScoreを叩く — ここで作ったものを後で1キーにまとめて書くため、
// psFetch側のキャッシュにも二重に書き込んでしまうと無料枠(KV書き込み1,000回/日)
// を余計に消費してしまう
export async function buildTodaySnapshot(token: string): Promise<BuildTodaySnapshotResult> {
  const { from, to, dateJst } = jstTodayRange();
  const targetGames = GAMES.filter((g) => !g.eventsOnly && g.liveSource !== "startgg");

  const [gameResults, runningResult] = await Promise.all([
    Promise.all(
      targetGames.map(async (g) => {
        const { matches, ok } = await fetchGameMatches(g.slug, from, to, token);
        return { slug: g.slug, matches, ok };
      })
    ),
    fetchRunningTournaments(token),
  ]);

  return {
    snapshot: {
      generatedAt: new Date().toISOString(),
      dateJst,
      perGame: Object.fromEntries(gameResults.map((r) => [r.slug, r.matches])),
      runningTournaments: runningResult.tournaments,
    },
    failedGames: gameResults.filter((r) => !r.ok).map((r) => r.slug),
    runningTournamentsFailed: !runningResult.ok,
    totalGames: targetGames.length,
  };
}

export async function readTodaySnapshot(
  kv: KVNamespace | undefined
): Promise<TodaySnapshot | null> {
  if (!kv) return null;
  try {
    return await kv.get<TodaySnapshot>(TODAY_SNAPSHOT_KEY, "json");
  } catch {
    return null;
  }
}

// 失敗した分は前回のスナップショットの値で埋め、空データで上書きしない。
// 全部失敗したときは書き込み自体をスキップして前回のデータをそのまま残す
// (2026-10-21、Cronが429で全滅した回に空スナップショットを書いてしまい、
// 既存の正常なデータまで消してしまっていた不具合への対応)
export async function writeTodaySnapshot(
  kv: KVNamespace,
  result: BuildTodaySnapshotResult
): Promise<{ written: boolean; keptFromPrevious: string[] }> {
  const { snapshot, failedGames, runningTournamentsFailed, totalGames } = result;

  if (failedGames.length === totalGames && runningTournamentsFailed) {
    return { written: false, keptFromPrevious: [] };
  }

  const keptFromPrevious: string[] = [];
  if (failedGames.length > 0 || runningTournamentsFailed) {
    const previous = await readTodaySnapshot(kv);
    if (previous) {
      for (const slug of failedGames) {
        if (previous.perGame[slug]) {
          snapshot.perGame[slug] = previous.perGame[slug];
          keptFromPrevious.push(slug);
        }
      }
      if (runningTournamentsFailed && previous.runningTournaments) {
        snapshot.runningTournaments = previous.runningTournaments;
      }
    }
  }

  await kv.put(TODAY_SNAPSHOT_KEY, JSON.stringify(snapshot), { expirationTtl: 60 * 60 });
  return { written: true, keptFromPrevious };
}
