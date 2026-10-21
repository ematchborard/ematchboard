/// <reference types="@cloudflare/workers-types" />
import { GAMES } from "./games";
import { jstTodayRange } from "./jst";
import type { Match } from "./types";

// 「今日(JST)の全ゲーム分の試合」をCronが1つのKVキーにまとめて書き込み、
// リクエスト処理側(/api/today・ホームの今日のビッグマッチ)はそれを読むだけに
// する仕組み。以前はリクエストごとに(prefetchも含め)ゲームの数だけ
// PandaScoreを叩いていて、アクセス数に比例して無料枠(1,000req/時)を
// 消費していた。Cronなら頻度が固定なので、アクセス数に関係なく
// PandaScoreへの問い合わせ回数が一定になる(2026-10-21の枯渇を受けて導入)。
// start.gg採用タイトル(Smash/SF6)はPandaScoreと無関係の別APIなので対象外
// (startgg.ts側の既存キャッシュ+stale fallbackで十分)。

export const TODAY_SNAPSHOT_KEY = "today-snapshot:v1";
const API_BASE = "https://api.pandascore.co";

export interface TodaySnapshot {
  generatedAt: string;
  dateJst: string;
  perGame: Record<string, Match[]>;
}

async function fetchGameMatches(
  gameSlug: string,
  from: Date,
  to: Date,
  token: string
): Promise<Match[]> {
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
      break;
    }
    console.log(
      `[cron][pandascore] ${res.status} ${gameSlug}/matches page=${page} remaining=${res.headers.get("x-rate-limit-remaining") ?? "?"}`
    );
    if (!res.ok) break;
    const batch = (await res.json()) as Match[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

// Cronの scheduled() からのみ呼ぶ。psFetch(リクエスト用の個別URLキャッシュ)は
// 通さず直接PandaScoreを叩く — ここで作ったものを後で1キーにまとめて書くため、
// psFetch側のキャッシュにも二重に書き込んでしまうと無料枠(KV書き込み1,000回/日)
// を余計に消費してしまう
export async function buildTodaySnapshot(token: string): Promise<TodaySnapshot> {
  const { from, to, dateJst } = jstTodayRange();
  const targetGames = GAMES.filter((g) => !g.eventsOnly && g.liveSource !== "startgg");

  const entries = await Promise.all(
    targetGames.map(async (g) => {
      const matches = await fetchGameMatches(g.slug, from, to, token);
      return [g.slug, matches] as const;
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    dateJst,
    perGame: Object.fromEntries(entries),
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
