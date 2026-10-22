import type { Player } from "./types";

// LoLのロール判定・並び替え。MatchLineups(対面ラインナップ)と
// PlayerRatingWidget(ファン採点)の両方で同じ基準を使う。

const ROLE_ORDER: Record<string, number> = {
  top: 0,
  jun: 1,
  jungle: 1,
  mid: 2,
  adc: 3,
  bot: 3,
  sup: 4,
  support: 4,
};

export const ROLE_LABEL: Record<string, string> = {
  top: "TOP",
  jun: "JNG",
  jungle: "JNG",
  mid: "MID",
  adc: "BOT",
  bot: "BOT",
  sup: "SUP",
  support: "SUP",
};

// TOP/JNG/MID/BOT/SUPの5ロールの正規キー(ROLE_ORDERの重複表記をまとめたもの)
const ROLE_KEYS = ["top", "jungle", "mid", "bot", "sup"] as const;
type RoleKey = (typeof ROLE_KEYS)[number];

function normalizeRole(role: string | null): RoleKey | null {
  const key = role?.toLowerCase() ?? "";
  if (key === "top") return "top";
  if (key === "jun" || key === "jungle") return "jungle";
  if (key === "mid") return "mid";
  if (key === "adc" || key === "bot") return "bot";
  if (key === "sup" || key === "support") return "sup";
  return null;
}

export function sortByRole(players: Player[]): Player[] {
  return players
    .slice()
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.role?.toLowerCase() ?? ""] ?? 9) -
        (ROLE_ORDER[b.role?.toLowerCase() ?? ""] ?? 9)
    );
}

export function roleLabelOf(role: string | null): string | null {
  return role ? (ROLE_LABEL[role.toLowerCase()] ?? role.toUpperCase()) : null;
}

// ロースターから「控えを除いた5人」をロール順(TOP/JNG/MID/BOT/SUP)で選ぶ。
// PandaScoreのロスターに控えが混ざっていると同じロールが複数出ることがあるため、
// 既定では各ロール最初の1人を採用する(先発とは限らない)。overrideIdsが
// 指定されていればそちらを優先する(data/roster-overrides.ts参照)
export function selectStartingFive(players: Player[], overrideIds?: number[]): Player[] {
  if (overrideIds && overrideIds.length > 0) {
    const byId = new Map(players.map((p) => [p.id, p]));
    const selected = overrideIds
      .map((id) => byId.get(id))
      .filter((p): p is Player => p !== undefined);
    if (selected.length > 0) return sortByRole(selected);
  }

  const byRole = new Map<RoleKey, Player>();
  for (const p of players) {
    const role = normalizeRole(p.role);
    if (role && !byRole.has(role)) byRole.set(role, p);
  }
  return ROLE_KEYS.map((r) => byRole.get(r)).filter((p): p is Player => p !== undefined);
}
