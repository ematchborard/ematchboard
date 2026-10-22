import { NextResponse, type NextRequest } from "next/server";
import { kvCache } from "@/lib/pandascore";

// PandaScore障害時、試合/チーム/大会ページがnotFound()で404を返すとGooglebotが
// 「ページが消えた」と判断してインデックスから外してしまう。各ページは失敗時に
// unavailable:${pathname} というKVキーを10分TTLで立てる(lib/unavailable-flag.ts)。
// ここではそのフラグだけを見て、立っていれば503+Retry-Afterを即返す
// (ページのレンダリングもPandaScoreへの再フェッチも発生しない)。これにより、
// Googlebotが同じ古いページを短時間に何度も巡回してきても2回目以降は
// PandaScoreに一切負荷をかけない(2026-10-22、枠切れの主因と判明したボット巡回への対応)。
// 初回アクセス(フラグがまだ無い)はページ側が通常どおり処理する。

export const config = {
  matcher: ["/:game/match/:id", "/:game/team/:id", "/:game/tournament/:id"],
};

const RETRY_AFTER_SECONDS = 600;

export async function middleware(request: NextRequest) {
  const kv = await kvCache();
  if (!kv) {
    const res = NextResponse.next();
    res.headers.set("x-unavail-debug", "no-kv");
    return res;
  }

  let flagged: string | null = null;
  try {
    flagged = await kv.get(`unavailable:${request.nextUrl.pathname}`);
  } catch (err) {
    const res = NextResponse.next();
    res.headers.set("x-unavail-debug", `kv-error:${String(err).slice(0, 80)}`);
    return res;
  }
  if (!flagged) {
    const res = NextResponse.next();
    res.headers.set("x-unavail-debug", "no-flag");
    return res;
  }

  return new Response(
    "<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\">" +
      "<title>一時的に利用できません — eMATCH BOARD</title></head>" +
      '<body style="font-family:system-ui;text-align:center;padding:4rem 1rem;">' +
      "<p>データの取得に失敗しました。しばらくしてからもう一度お試しください。</p>" +
      "</body></html>",
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": String(RETRY_AFTER_SECONDS),
      },
    }
  );
}
