import { leaguePriority } from "./popularity";
import type { Match } from "./types";

// SEO用ヘルパー。検索エンジンに読ませるテキストや構造化データの材料を作る

// 試合リストから人気順の大会名(重複なし)を上位N件
export function topEventNames(
  matches: Match[],
  gameSlug: string,
  limit = 3
): string[] {
  const seen = new Map<string, number>();
  for (const m of matches) {
    const name = `${m.league.name} ${m.serie.full_name ?? ""}`.trim();
    if (name && !seen.has(name)) {
      seen.set(name, leaguePriority(gameSlug, name, m.tournament.tier));
    }
  }
  return [...seen.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([name]) => name);
}

// JSON-LD(構造化データ)をscriptタグ用に安全な文字列へ
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
