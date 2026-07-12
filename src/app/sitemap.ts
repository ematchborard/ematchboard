import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games";
import { getMatches } from "@/lib/pandascore";

// サイトマップ。固定ページに加えて「直近1週間〜今後1ヶ月に試合がある大会ページ」を
// 動的に載せる(プログラマティックSEOの本体: 大会名での検索流入の入口になる)。
// 1時間ごとに再生成。日付は日単位に丸めてAPIキャッシュのキーを安定させる。

const BASE = process.env.SITE_URL ?? "https://ematchboard.com";
const DAY_MS = 86_400_000;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "hourly", priority: 1 },
    ...GAMES.map((g) => ({
      url: `${BASE}/${g.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const todayUtc = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  const from = new Date(todayUtc - 7 * DAY_MS);
  const to = new Date(todayUtc + 30 * DAY_MS);

  for (const g of GAMES.filter((g) => !g.eventsOnly)) {
    try {
      const matches = await getMatches(g.slug, from, to);
      const serieIds = [...new Set(matches.map((m) => m.serie.id))];
      for (const id of serieIds) {
        entries.push({
          url: `${BASE}/${g.slug}/event/${id}`,
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    } catch {
      // 1ゲーム分の取得失敗でsitemap全体を壊さない
    }
  }

  return entries;
}
