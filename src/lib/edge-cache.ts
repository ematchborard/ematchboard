/// <reference types="@cloudflare/workers-types" />

// Cloudflare Cache API(caches.default)の薄いラッパー。KVと違い書き込み回数の
// 上限が無いので、Googlebotが何ページ巡回してきても書き込み自体が失敗することは
// ない。代わりに拠点(colo)ごとに別キャッシュになる(グローバル共有ではない)。
// 2026-10-22、終わった試合ページへのボット巡回でKVの書き込み上限(1,000回/日)を
// 使い切り、Cronのスナップショット更新まで共倒れした不具合を受けて導入
// (KVは以後、Cronが書くスナップショット/大会データ専用にする)。
//
// キーはCache APIの制約上URL形状である必要がある。実在するPandaScoreのURLを
// そのまま使う場合はそれでよいが、それ以外(フラグ等)は実在しない内部用ホストの
// 疑似URLを使う(実際にネットワークへは出ない、あくまでキャッシュキーとしてのみ使用)。
//
// caches.defaultはDOM libの型(.defaultを持たない)と衝突するためキャストしている。
// next dev等、Cloudflareのランタイムが無い環境ではcaches自体が存在しないので
// 呼び出し側でのtry/catchをこの中に内蔵してある

function edgeCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

export async function edgeCacheGet<T>(key: string): Promise<T | null> {
  try {
    const hit = await edgeCache().match(new Request(key));
    if (!hit) return null;
    return (await hit.json()) as T;
  } catch {
    return null;
  }
}

export async function edgeCachePut(key: string, raw: string, ttlSec: number): Promise<void> {
  try {
    const res = new Response(raw, {
      headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${ttlSec}` },
    });
    await edgeCache().put(new Request(key), res);
  } catch {
    // 無視(次回また上流から取る)
  }
}

export async function edgeCacheHas(key: string): Promise<boolean> {
  try {
    return (await edgeCache().match(new Request(key))) !== undefined;
  } catch {
    return false;
  }
}
