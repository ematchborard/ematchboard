import { edgeCacheHas, edgeCachePut } from "./edge-cache";

// PandaScore障害時に試合/チーム/大会ページが404を返すとGooglebotがページを
// インデックスから落としてしまう。一度「取得不可」と分かったパスはここに10分間
// 記録し、middleware.tsがそれを見て以降のアクセスには再フェッチ無しで即503+
// Retry-Afterを返す(Googlebotが同じ古いページを短時間に何度も巡回してくる
// ケースでの無駄なPandaScore呼び出しも同時に防げる)。
// Cache API(caches.default)を使う(2026-10-22、KVの書き込み上限1,000回/日を
// 守るため。この手のフラグはCron以外の全KV書き込みと同じ理由でKVから外した)。
// 疑似URLをキーにしているのは実在しない内部用ホストで、ネットワークへは出ない。

export const UNAVAILABLE_TTL_SEC = 600;

const flagKey = (pathname: string) => `https://edge-cache.internal/unavailable${pathname}`;

export async function markUnavailable(pathname: string): Promise<void> {
  await edgeCachePut(flagKey(pathname), "1", UNAVAILABLE_TTL_SEC);
}

export async function isMarkedUnavailable(pathname: string): Promise<boolean> {
  return edgeCacheHas(flagKey(pathname));
}
