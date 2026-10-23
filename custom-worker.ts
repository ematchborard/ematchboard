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
import { buildTodaySnapshot, writeTodaySnapshot } from "./src/lib/today-snapshot";
import { buildWorldsSnapshot, readWorldsSnapshot, writeWorldsSnapshot } from "./src/lib/worlds-snapshot";
import { extractWorldsTeamIds, refreshWorldsRecentForm } from "./src/lib/worlds-recent-form";

interface Env {
  MATCH_CACHE: KVNamespace;
  PANDASCORE_TOKEN?: string;
}

// 終了済み試合ページ(/[game]/match/[id])の200応答だけをCache APIに
// キャッシュし、2回目以降はNext.jsのレンダリングを一切経由せずに返す。
// 「終了済みか」の判定は、そのページが呼ぶgetMatch()(src/lib/pandascore.ts)が
// 終了済み試合にだけ書く既存のCache APIキーをそのまま流用する(新しい
// シグナルのやり取りを増やさない)。対象はステータス200のみで、
// リダイレクト・エラー・503はキャッシュしない。
// 2026-10-22、Googlebotの巡回がKVの書き込み上限(1,000回/日)を使い切り、
// Cronのスナップショット更新まで共倒れした不具合を受けて導入。
// このfetchハンドラの変更は過去に本番障害(www/httpリダイレクトの誤実装)を
// 起こした箇所なので、ルーティング/リダイレクトには一切手を入れず、
// 既存のhandler.fetchの前後に読み取り専用のキャッシュ判定を足すだけに
// とどめている。
const FINISHED_MATCH_PATH_RE = /^\/[^/]+\/match\/(\d+)$/;
const FINISHED_MATCH_PAGE_TTL_SEC = 7 * 24 * 60 * 60;

function finishedMatchDetailCacheKey(id: string): string {
  return `https://edge-cache.internal/match-detail-finished/${id}`;
}

async function fetchWithFinishedMatchCache(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== "GET") return handler.fetch(request, env, ctx);

  const url = new URL(request.url);
  const m = url.pathname.match(FINISHED_MATCH_PATH_RE);
  if (!m) return handler.fetch(request, env, ctx);

  const cache = (caches as unknown as { default: Cache }).default;

  try {
    const cachedPage = await cache.match(request);
    if (cachedPage) return cachedPage;
  } catch {
    // キャッシュ読み取り失敗は無視して通常どおりレンダリング
  }

  const response = await handler.fetch(request, env, ctx);

  if (response.status === 200) {
    // クライアントへ返す前に同期的に複製を取っておく(返した後だとbody
    // ストリームが読まれ始めてclone()できないため)。実際にキャッシュするかは
    // 後段のisFinished判定次第で、該当しなければこの複製は単に捨てられる
    const toCache = response.clone();
    const matchId = m[1];
    ctx.waitUntil(
      (async () => {
        try {
          const isFinished =
            (await cache.match(new Request(finishedMatchDetailCacheKey(matchId)))) !== undefined;
          if (!isFinished) return;
          toCache.headers.set("Cache-Control", `public, max-age=${FINISHED_MATCH_PAGE_TTL_SEC}`);
          await cache.put(request, toCache);
        } catch {
          // キャッシュ保存失敗は無視(次回も同じ判定を試みるだけ)
        }
      })()
    );
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

// /worlds ページ専用のスナップショット(series/tournaments/matches)。
// today-snapshotとは独立したジョブなので、片方が失敗してももう片方には影響しない
async function runWorldsSnapshotJob(env: Env): Promise<void> {
  if (!env.PANDASCORE_TOKEN) return; // 上のジョブで既にログ済み
  try {
    const result = await buildWorldsSnapshot(env.PANDASCORE_TOKEN);
    const { written, keptFromPrevious } = await writeWorldsSnapshot(env.MATCH_CACHE, result);
    if (!written) {
      console.error("[cron][worlds] serie+tournaments+matches all failed, skipping write");
      return;
    }
    console.log(
      `[cron][worlds] snapshot written: ${result.snapshot.matches.length} matches` +
        (keptFromPrevious.length > 0 ? `, kept previous for: ${keptFromPrevious.join(",")}` : "")
    );
  } catch (err) {
    console.error("[cron][worlds] snapshot build failed:", err);
  }
}

// Worlds出場チームの直近成績(Recent form)を1時間おきにまとめて温めておく
// (lib/worlds-recent-form.ts。lib/pandascore.tsのgetTeamRecentMatchesと同じ
// キャッシュキーに書くので、試合ページ側はCronが先に書いていればPandaScoreを
// 呼ばずに済む)
async function runWorldsRecentFormJob(env: Env): Promise<void> {
  if (!env.PANDASCORE_TOKEN) return; // 他のジョブで既にログ済み
  try {
    const snapshot = await readWorldsSnapshot(env.MATCH_CACHE);
    if (!snapshot) return;
    const teamIds = extractWorldsTeamIds(snapshot);
    if (teamIds.length === 0) return;
    await refreshWorldsRecentForm(env.PANDASCORE_TOKEN, teamIds);
    console.log(`[cron][worlds-recent-form] refreshed ${teamIds.length} teams`);
  } catch (err) {
    console.error("[cron][worlds-recent-form] failed:", err);
  }
}

// 2種類のtriggerをevent.cronで振り分ける(wrangler.jsonc参照)。
// 2026-10-24、ここをevent.cronで分けずに全ジョブを無条件実行していたところ、
// 毎時0分に両triggerが同時に発火して全クロンジョブが二重実行され、本番で
// Cloudflare WorkerのCPU/リソース制限超過(503 error 1102)が断続的に
// 発生する障害になった。triggerごとに対応するジョブだけを実行することと、
// 2つのtriggerの発火タイミングを重ねない("*/5 * * * *"の0分と衝突しない
// "7 * * * *"を使う)ことの両方で再発を防いでいる
export default {
  fetch: fetchWithFinishedMatchCache,
  async scheduled(event, env: Env, ctx) {
    if (event.cron === "*/5 * * * *") {
      ctx.waitUntil(runSnapshotJob(env));
      ctx.waitUntil(runWorldsSnapshotJob(env));
    }
    if (event.cron === "7 * * * *") {
      ctx.waitUntil(runWorldsRecentFormJob(env));
    }
  },
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- 上と同じ理由
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
