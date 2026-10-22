import { NextResponse, type NextRequest } from "next/server";
import { isMarkedUnavailable } from "@/lib/unavailable-flag";

// PandaScore障害時、試合/チーム/大会ページがnotFound()で404を返すとGooglebotが
// 「ページが消えた」と判断してインデックスから外してしまう。各ページは失敗時に
// lib/unavailable-flag.tsでCache APIにフラグを10分立てる。ここではそのフラグ
// だけを見て、立っていれば503+Retry-Afterを即返す(ページのレンダリングも
// PandaScoreへの再フェッチも発生しない)。これにより、Googlebotが同じ古い
// ページを短時間に何度も巡回してきても2回目以降はPandaScoreに一切負荷を
// かけない(2026-10-22、枠切れの主因と判明したボット巡回への対応)。
// 初回アクセス(フラグがまだ無い)はページ側が通常どおり処理する。
//
// 終了済み試合ページへのCDNエッジキャッシュは別途middlewareでCache-Controlを
// 付けて試したが、Next.jsがdynamicルートに強制する
// `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` が
// middlewareの設定を上書きしてしまい効果が無いことを本番で確認したため撤回した
// (この503の短絡は、Next.jsのページ処理を経由しない生のResponseを直接返すので
// この上書きの影響を受けず機能する)。

export const config = {
  matcher: ["/:game/match/:id", "/:game/team/:id", "/:game/tournament/:id"],
};

const RETRY_AFTER_SECONDS = 600;

export async function middleware(request: NextRequest) {
  const flagged = await isMarkedUnavailable(request.nextUrl.pathname);
  if (!flagged) return NextResponse.next();

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
