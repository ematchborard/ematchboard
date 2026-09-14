import { NextResponse } from "next/server";
import { GAMES } from "@/lib/games";
import { getMatches } from "@/lib/pandascore";
import { getStartggMatches, type StartggGameSlug } from "@/lib/startgg";
import { eventsOverlapping } from "@/lib/manual-events";

// 日次X投稿の下書き作成(Cloudエージェント)用の公開JSON。
// PandaScore/start.ggのトークンはここでもサーバー側だけで使い、レスポンスには
// 含めない(このエンドポイント自体は誰でも読める — サイトの各ページで既に
// 公開されている試合情報を1箇所にまとめて返すだけなので、認証は不要)。

export const revalidate = 300;

function jstTodayRange(): { from: Date; to: Date; dateJst: string } {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60_000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth();
  const d = jst.getUTCDate();
  const dateJst = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // JST 00:00 のその日始まりをUTCに戻す(JSTはUTC+9なので前日15:00Z)
  const fromUtcMs = Date.UTC(y, m, d) - 9 * 60 * 60_000;
  return {
    from: new Date(fromUtcMs),
    to: new Date(fromUtcMs + 24 * 60 * 60_000),
    dateJst,
  };
}

export async function GET() {
  const { from, to, dateJst } = jstTodayRange();

  const liveGames = GAMES.filter((g) => !g.eventsOnly);
  const perGame = await Promise.all(
    liveGames.map(async (g) => {
      const matches = await (g.liveSource === "startgg"
        ? getStartggMatches(g.slug as StartggGameSlug, from, to)
        : getMatches(g.slug, from, to)
      ).catch(() => []);
      const todays = matches.filter((m) => {
        if (!m.begin_at) return false;
        const t = Date.parse(m.begin_at);
        return t >= from.getTime() && t < to.getTime();
      });
      return {
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
      };
    })
  );

  // 手動キュレーション組(Apex/Fortnite等)のうち、今日と期間が重なる大会
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
    games: perGame.filter((g) => g.matches.length > 0),
    manual_events_today: manualToday,
  });
}
