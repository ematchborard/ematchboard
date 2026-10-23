/// <reference types="@cloudflare/workers-types" />
import { NextResponse, type NextRequest } from "next/server";

// 一時デバッグ用。終了済み試合ページの7日キャッシュ(custom-worker.ts)を
// デプロイ前に書かれた分だけ手動で消すために使う。動作確認後に削除する。
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  const cache = (caches as unknown as { default: Cache }).default;
  const deleted = await cache.delete(new Request(url));
  return NextResponse.json({ url, deleted });
}
