import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games";

// 検索エンジン向けサイトマップ。大会/チーム/試合ページは数が動的に変わるので
// まずは主要な固定ページのみ(SEOが軌道に乗ったら動的URLの追加を検討)。

const BASE = process.env.SITE_URL ?? "https://ematchboard.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "hourly", priority: 1 },
    ...GAMES.map((g) => ({
      url: `${BASE}/${g.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
