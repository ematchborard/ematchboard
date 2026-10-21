import type { NextConfig } from "next";

// www./http:// → 正規URL(https://ematchboard.com)への301リダイレクトは、
// ここ(redirects()のhost/header条件)ではOpenNext経由だと効かないことを実測で
// 確認したため、custom-worker.ts のfetchハンドラ側で直接処理している

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
