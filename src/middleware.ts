import { NextResponse, type NextRequest } from "next/server";
import { finishedMatchCacheKey, kvCache } from "@/lib/pandascore";

// PandaScore障害時、試合/チーム/大会ページがnotFound()で404を返すとGooglebotが
// 「ページが消えた」と判断してインデックスから外してしまう。各ページは失敗時に
// unavailable:${pathname} というKVキーを10分TTLで立てる(lib/unavailable-flag.ts)。
// ここではそのフラグだけを見て、立っていれば503+Retry-Afterを即返す
// (ページのレンダリングもPandaScoreへの再フェッチも発生しない)。これにより、
// Googlebotが同じ古いページを短時間に何度も巡回してきても2回目以降は
// PandaScoreに一切負荷をかけない(2026-10-22、枠切れの主因と判明したボット巡回への対応)。
// 初回アクセス(フラグがまだ無い)はページ側が通常どおり処理する。
//
// 加えて、終了済み試合ページ(/match/:id)には長めのCache-Controlを付け、
// CloudflareのCDNエッジキャッシュに乗せる。判定はgetMatch()が終了済み試合にだけ
// 書く専用KVキー(match-detail-finished:{id})の有無を見るだけなので、これも
// 追加のPandaScore呼び出しを発生させない。結果が変わらない終了済み試合に
// Googlebotが繰り返しアクセスしてきても、2回目以降はCDNが返してWorkerまで
// 届かなくなることを期待している(custom-worker.tsのfetchハンドラには一切触れず、
// 標準のNext.js middlewareだけで完結させている — 過去にfetchハンドラへ直接
// キャッシュ処理を足して本番障害になった反省から)。

export const config = {
  matcher: ["/:game/match/:id", "/:game/team/:id", "/:game/tournament/:id"],
};

const RETRY_AFTER_SECONDS = 600;
const FINISHED_MATCH_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

export async function middleware(request: NextRequest) {
  const kv = await kvCache();
  if (!kv) return NextResponse.next();

  const pathname = request.nextUrl.pathname;

  let flagged: string | null = null;
  try {
    flagged = await kv.get(`unavailable:${pathname}`);
  } catch {
    return NextResponse.next();
  }
  if (flagged) {
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

  const matchIdMatch = pathname.match(/\/match\/(\d+)$/);
  if (matchIdMatch) {
    const isFinished = await kv.get(finishedMatchCacheKey(Number(matchIdMatch[1]))).catch(() => null);
    if (isFinished) {
      const res = NextResponse.next();
      res.headers.set("Cache-Control", FINISHED_MATCH_CACHE_CONTROL);
      return res;
    }
  }

  return NextResponse.next();
}
