import { kvCache } from "./pandascore";

// PandaScore障害時に試合/チーム/大会ページが404を返すとGooglebotがページを
// インデックスから落としてしまう。一度「取得不可」と分かったパスはここに10分間
// 記録し、middleware.tsがそれを見て以降のアクセスには再フェッチ無しで即503+
// Retry-Afterを返す(Googlebotが同じ古いページを短時間に何度も巡回してくる
// ケースでの無駄なPandaScore呼び出しも同時に防げる)。TTLはRetry-Afterの
// 秒数と合わせてあり、クリアは行わない(書き込み回数を節約するため。無料枠
// 1,000回/日を守る都合上、成功時にdeleteする分の書き込みは使わない)。

export const UNAVAILABLE_TTL_SEC = 600;

export async function markUnavailable(pathname: string): Promise<void> {
  const kv = await kvCache();
  if (!kv) return;
  try {
    await kv.put(`unavailable:${pathname}`, "1", { expirationTtl: UNAVAILABLE_TTL_SEC });
  } catch {
    // 無視
  }
}
