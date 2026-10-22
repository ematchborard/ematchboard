import { NextResponse, type NextRequest } from "next/server";
import { kvCache } from "@/lib/pandascore";

// 一時デバッグ用(503切り替えの動作確認後に削除する)。
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const kv = await kvCache();
  if (!kv) return NextResponse.json({ hasKv: false });
  const value = await kv.get(key);
  return NextResponse.json({ hasKv: true, key, value });
}
