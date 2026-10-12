// ISO 3166-1 alpha-2 国コードを国旗絵文字に変換する(リージョナルインジケーター記号への変換)。
// "ASIA" 等の2文字でないコードや不正な文字列はnullを返す
export function countryFlag(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  const points = [...upper].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  if (points.some((p) => p < 0x1f1e6 || p > 0x1f1ff)) return null;
  return String.fromCodePoint(...points);
}
