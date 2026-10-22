/// <reference types="@cloudflare/workers-types" />
import { getCloudflareContext } from "@opennextjs/cloudflare";

// ファン採点機能用のD1アクセサ。kvCache()(lib/pandascore.ts)と同じパターンで、
// Cloudflareコンテキストが無い環境(next dev等)ではundefinedを返す。
export async function ratingsDb(): Promise<D1Database | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as { RATINGS_DB?: D1Database }).RATINGS_DB;
  } catch {
    return undefined;
  }
}
