import type { MetadataRoute } from "next";

const BASE = process.env.SITE_URL ?? "https://ematchboard.com";

export default function robots(): MetadataRoute.Robots {
  return {
    // ?view= や ?d= などパラメータ付きURLはクロール不要(重複コンテンツ+
    // クローラーがAPIレート制限を食い潰すのを防ぐ)
    rules: { userAgent: "*", allow: "/", disallow: "/*?" },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
