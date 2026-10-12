import { NextResponse } from "next/server";
import { GAMES } from "@/lib/games";
import { getTodayMatchesAllGames, jstTodayRange } from "@/lib/featured";
import { eventsOverlapping } from "@/lib/manual-events";

// 日次X投稿の下書き作成(Cloudエージェント)用の公開JSON。
// PandaScore/start.ggのトークンはここでもサーバー側だけで使い、レスポンスには
// 含めない(このエンドポイント自体は誰でも読める — サイトの各ページで既に
// 公開されている試合情報を1箇所にまとめて返すだけなので、認証は不要)。
// 「今日(JST)」の定義・取得ロジックはホームの「今日のビッグマッチ」枠と
// lib/featured.ts を共有している。

export const revalidate = 300;

export async function GET() {
  const { dateJst } = jstTodayRange();
  const perGame = await getTodayMatchesAllGames();

  const games = perGame.map(({ game: g, matches: todays }) => ({
    slug: g.slug,
    name: g.name,
    popular: Boolean(g.popular),
    matches: todays.map((m) => ({
      id: m.id,
      begin_at: m.begin_at,
      status: m.status,
      league: m.league?.name ?? null,
      serie: m.serie?.full_name ?? null,
      tournament: m.tournament?.name ?? null,
      tier: m.tournament?.tier ?? null,
      teamA: m.opponents[0]?.opponent?.name ?? null,
      teamB: m.opponents[1]?.opponent?.name ?? null,
      url: `https://ematchboard.com/${g.slug}/match/${m.id}`,
    })),
  }));

  // 手動キュレーション組(Apex/Fortnite等)のうち、今日と期間が重なる大会
  const { from, to } = jstTodayRange();
  const eventsOnlyGames = GAMES.filter((g) => g.eventsOnly);
  const manualToday = eventsOnlyGames.flatMap((g) =>
    eventsOverlapping(g.slug, from.getTime(), to.getTime()).map((e) => ({
      game: g.slug,
      gameName: g.name,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location ?? null,
      url: `https://ematchboard.com/${g.slug}`,
    }))
  );

  return NextResponse.json({
    date_jst: dateJst,
    generated_at: new Date().toISOString(),
    games: games.filter((g) => g.matches.length > 0),
    manual_events_today: manualToday,
  });
}
