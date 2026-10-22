import { NextResponse, type NextRequest } from "next/server";
import { kvCache } from "@/lib/pandascore";

// 一時デバッグ用(503切り替えの動作確認後に削除する)。
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const write = request.nextUrl.searchParams.get("write");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const kv = await kvCache();
  if (!kv) return NextResponse.json({ hasKv: false });
  if (write) {
    try {
      await kv.put(key, write, { expirationTtl: 600 });
      return NextResponse.json({ wrote: true, key, write });
    } catch (err) {
      return NextResponse.json({ wrote: false, error: String(err) });
    }
  }
  const value = await kv.get(key);
  return NextResponse.json({ hasKv: true, key, value });
}
