/// <reference types="@cloudflare/workers-types" />
// OpenNextが生成する.open-next/worker.jsのfetchハンドラをそのまま使いつつ、
// scheduled()(Cloudflare Cron Trigger)を追加するためのラッパー。
// 「今日(JST)の全ゲーム分の試合」をここで定期的にまとめて取得し、1つのKVキーに
// 書き込む(today-snapshot.ts)。リクエスト処理側(featured.ts)はそれを読むだけに
// なるので、アクセス数やLinkのprefetchに関係なくPandaScoreへの問い合わせ回数が
// Cronの頻度だけで決まるようになる(2026-10-21の無料枠枯渇を受けて導入)。
//
// wrangler.jsonc の main をこのファイルに向け、triggers.crons でスケジュールを
// 設定する。ビルド手順(npm run preview/deploy)はopennextjs-cloudflareが
// .open-next/worker.js を生成した後にwranglerがこのファイルをエントリーとして
// バンドルする流れなので、対応は不要(このファイルを書くだけでよい)。

// `.open-next/worker.js` はビルド時に生成されるファイル。next build単体の型
// チェック時点ではまだ存在しないことがあり、「存在する前提のディレクティブ」
// だと存在する/しないでunused directiveエラーが不安定に出るため、
// 常に無視できる形のディレクティブを使っている
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import handler from "./.open-next/worker.js";
import { finishedMatchCacheKey } from "./src/lib/pandascore";
import { buildTodaySnapshot, writeTodaySnapshot } from "./src/lib/today-snapshot";

interface Env {
  MATCH_CACHE: KVNamespace;
  PANDASCORE_TOKEN?: string;
}

const MATCH_PAGE_PATTERN = /^\/[a-z0-9-]+\/match\/(\d+)\/?$/;
const EDGE_CACHE_TTL_SEC = 7 * 24 * 60 * 60; // getMatch()の終了済み試合長期キャッシュと同じ7日

// 終了済みと判明している試合の詳細ページは、2回目以降のアクセスでWorkerの
// 実行(=CPU時間・PandaScoreへの問い合わせ)を一切発生させずCloudflareのエッジ
// キャッシュから直接返す。Googlebotが古い試合ページを繰り返し巡回してCPU時間
// 上限(無料プラン10ms)を超えることがあった問題への対応(2026-10-22)。
// caches.defaultは拠点ごとに別物(グローバル共有ではない)だが、同じボットは
// 大体同じ拠点から繰り返しアクセスしてくるのでこの用途には十分機能する。
// 「終了済みかどうか」はpandascore.tsのgetMatch()が書くKVキー(finishedMatchCacheKey)
// を見て判断する(HTMLの中身を見て判定するより確実で安い)
async function handleMatchPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // DOM libのCacheStorage型(lib.dom.d.ts)には.defaultが無く、tsconfigの
  // "dom"指定(他の多くのファイルがブラウザAPIの型を必要とするため)が
  // Workers版の型より優先されてしまうための回避キャスト
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(request.url, request);

  try {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.error("[edge-cache] cache.match failed, falling back to normal render:", err);
  }

  const response: Response = await handler.fetch(request, env, ctx);

  if (response.ok) {
    const match = MATCH_PAGE_PATTERN.exec(new URL(request.url).pathname);
    const matchId = match?.[1];
    if (matchId) {
      // response.bodyは一度しか読めないので、クライアントへ返す分とは別に
      // ここでclone()して独立したストリームを確保してからバックグラウンドへ渡す
      const responseForCache = response.clone();
      ctx.waitUntil(
        (async () => {
          try {
            const isFinished = await env.MATCH_CACHE.get(finishedMatchCacheKey(Number(matchId)));
            if (!isFinished) return;
            const toCache = new Response(responseForCache.body, responseForCache);
            toCache.headers.set(
              "Cache-Control",
              `public, s-maxage=${EDGE_CACHE_TTL_SEC}, stale-while-revalidate=86400`
            );
            await cache.put(cacheKey, toCache);
          } catch (err) {
            console.error("[edge-cache] failed to cache finished match page:", err);
          }
        })()
      );
    }
  }

  return response;
}

async function runSnapshotJob(env: Env): Promise<void> {
  if (!env.PANDASCORE_TOKEN) {
    console.error("[cron] PANDASCORE_TOKEN not set, skipping");
    return;
  }
  try {
    const result = await buildTodaySnapshot(env.PANDASCORE_TOKEN);
    const { written, keptFromPrevious } = await writeTodaySnapshot(env.MATCH_CACHE, result);
    if (!written) {
      console.error(
        `[cron] all ${result.totalGames} games + tournaments/running failed, skipping write to keep previous snapshot`
      );
      return;
    }
    const okGames = result.totalGames - result.failedGames.length;
    const totalMatches = Object.values(result.snapshot.perGame).reduce((n, m) => n + m.length, 0);
    console.log(
      `[cron] snapshot written: ${okGames}/${result.totalGames} games fresh, ${totalMatches} matches` +
        (keptFromPrevious.length > 0 ? `, kept previous for: ${keptFromPrevious.join(",")}` : "")
    );
  } catch (err) {
    console.error("[cron] snapshot build failed:", err);
  }
}

const CANONICAL_HOST = "ematchboard.com";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // www./http:// → 正規URL(https://ematchboard.com)へ301。next.config.tsの
    // redirects()(host/header条件)はOpenNext経由だと効かなかった(実測で確認済み)
    // ため、リクエストを直接見られるここで処理する(2026-10-22)
    if (url.hostname === `www.${CANONICAL_HOST}` || url.protocol === "http:") {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    if (request.method === "GET" && MATCH_PAGE_PATTERN.test(url.pathname)) {
      return handleMatchPage(request, env, ctx);
    }
    return handler.fetch(request, env, ctx);
  },
  async scheduled(_event, env: Env, ctx) {
    ctx.waitUntil(runSnapshotJob(env));
  },
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- 上と同じ理由
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
