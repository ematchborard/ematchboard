import type { NextConfig } from "next";

// www./http://の別URLでも同じページがクロールされてしまう問題への対応
// (2026-10-22、Googlebotが3つの表記ゆれを別々に巡回していた)。
// 正規URLは https://ematchboard.com に統一する
const CANONICAL_HOST = "ematchboard.com";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${CANONICAL_HOST}` }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
