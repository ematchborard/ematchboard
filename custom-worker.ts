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
import { buildTodaySnapshot, TODAY_SNAPSHOT_KEY } from "./src/lib/today-snapshot";

interface Env {
  MATCH_CACHE: KVNamespace;
  PANDASCORE_TOKEN?: string;
}

async function runSnapshotJob(env: Env): Promise<void> {
  if (!env.PANDASCORE_TOKEN) {
    console.error("[cron] PANDASCORE_TOKEN not set, skipping");
    return;
  }
  try {
    const snapshot = await buildTodaySnapshot(env.PANDASCORE_TOKEN);
    await env.MATCH_CACHE.put(TODAY_SNAPSHOT_KEY, JSON.stringify(snapshot), {
      expirationTtl: 60 * 60, // 次のCronが来なくても1時間で自動失効(古すぎるデータで止まるのを防ぐ)
    });
    console.log(
      `[cron] snapshot written: ${Object.keys(snapshot.perGame).length} games, ${Object.values(snapshot.perGame).reduce((n, m) => n + m.length, 0)} matches`
    );
  } catch (err) {
    console.error("[cron] snapshot build failed:", err);
  }
}

export default {
  fetch: handler.fetch,
  async scheduled(_event, env: Env, ctx) {
    ctx.waitUntil(runSnapshotJob(env));
  },
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- 上と同じ理由
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
