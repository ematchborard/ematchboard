import type { Match } from "./types";

// Esports World Cup (EWC) 横断ハブ用の定数・判定ロジック。
// 2026年大会: 7/6〜8/23, Paris, 24タイトル・25大会, 総額$75Mの賞金プール
// (出典: https://liquipedia.net/esports/Esports_World_Cup/2026 , 2026-07時点)。
// 参加タイトルと日程は毎年変わるので、シーズンが変わったら更新すること。

export const EWC_YEAR = 2026;
export const EWC_START = "2026-07-06";
export const EWC_END = "2026-08-23";
export const EWC_LOCATION = "Paris, France";
export const EWC_PRIZE_POOL = "$75,000,000";
export const EWC_INFO_URL = "https://liquipedia.net/esports/Esports_World_Cup/2026";

// 試合の league/serie 名に "EWC" または "Esports World Cup" が含まれるか。
// 単語境界で判定し、チーム名などへの偶発マッチを避ける。
const EWC_PATTERN = /\bewc\b|esports world cup/i;

export function isEwcMatch(match: Match): boolean {
  const name = `${match.league.name} ${match.serie.full_name ?? ""}`;
  return EWC_PATTERN.test(name);
}

// API連携ゲームのうち、EWC 2026 に参加が確認できているものだけを対象に、
// その種目の開催期間(前後1日パディング)でだけ問い合わせる。
// (7週間のEWC全期間を全ゲームで走査すると通常シーズンの試合まで大量に
//  取得してしまい遅くなるため、種目ごとの実際の開催窓に絞ることで
//  取得量と速度を両立させる。StarCraft 2 のようにEWC非参加のゲームは
//  ここに載せず、無駄なAPIコールを避ける)
export const EWC_GAME_WINDOWS: Record<string, { start: string; end: string }> = {
  valorant: { start: "2026-07-01", end: "2026-07-13" },
  dota2: { start: "2026-07-06", end: "2026-07-20" },
  mlbb: { start: "2026-07-13", end: "2026-08-02" },
  lol: { start: "2026-07-14", end: "2026-07-20" },
  pubg: { start: "2026-07-20", end: "2026-07-27" },
  fifa: { start: "2026-07-21", end: "2026-07-27" },
  ow: { start: "2026-07-28", end: "2026-08-03" },
  codmw: { start: "2026-07-29", end: "2026-08-10" },
  r6siege: { start: "2026-08-03", end: "2026-08-16" },
  rl: { start: "2026-08-11", end: "2026-08-17" },
  csgo: { start: "2026-08-11", end: "2026-08-24" },
};
