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
export type RoleKey = (typeof ROLE_KEYS)[number];

// 手動スタメン指定1枠分(data/roster-overrides.ts参照)。nameはPandaScoreの
// player名と大文字小文字を無視して照合する
export interface RosterOverrideEntry {
  role: RoleKey;
  name: string;
}

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

// ロールごとに配列の先頭1人を採用する自動選出(手動指定が無い/埋まらない枠用)
function autoSelectByRole(players: Player[]): Player[] {
  const byRole = new Map<RoleKey, Player>();
  for (const p of players) {
    const role = normalizeRole(p.role);
    if (role && !byRole.has(role)) byRole.set(role, p);
  }
  return ROLE_KEYS.map((r) => byRole.get(r)).filter((p): p is Player => p !== undefined);
}

// ロースターから「控えを除いた5人」をロール順(TOP/JNG/MID/BOT/SUP)で選ぶ。
// 同じロールに複数人いる場合の優先順位:
//   1. override(手動指定、data/roster-overrides.ts)があればそれを最優先。
//      選手名はPandaScoreのplayer名と大文字小文字を無視して照合し、
//      ロールもoverride側の値で上書きする(PandaScoreのroleが誤っている
//      チームがあるため)。見つからない選手はコンソールに警告を出し、
//      その枠だけ下の自動選出で埋める
//   2. (直近の試合での出場数を使いたいところだが、PandaScoreの無料プランには
//      「どの選手がどの試合に実際に出場したか」という試合単位のデータが無く
//      [/matches/:idのgames[]はチームの勝敗のみで選手情報を含まない]、
//      判定不可能なため実装していない)
//   3. ロスター配列の並び順で先に出てきた方(登録順の代わり)
export function selectStartingFive(
  players: Player[],
  override?: RosterOverrideEntry[],
  teamLabel?: string
): Player[] {
  if (!override || override.length === 0) {
    return autoSelectByRole(players);
  }

  const byNameLower = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const result: Player[] = [];
  const filledRoles = new Set<RoleKey>();
  for (const entry of override) {
    const match = byNameLower.get(entry.name.toLowerCase());
    if (match) {
      // ロールはoverride側を優先して上書きする
      result.push({ ...match, role: entry.role });
      filledRoles.add(entry.role);
    } else {
      console.warn(
        `[roster-override] ${teamLabel ?? ""}: player "${entry.name}" (${entry.role}) not found in roster, falling back to auto-select for this slot`
      );
    }
  }
  if (filledRoles.size < ROLE_KEYS.length) {
    for (const p of autoSelectByRole(players)) {
      const role = normalizeRole(p.role);
      if (role && !filledRoles.has(role)) {
        result.push(p);
        filledRoles.add(role);
      }
    }
  }
  return sortByRole(result);
}

// selectStartingFiveで選ばれなかった残り(控え)。Lineups下部の表示用
export function selectBench(players: Player[], starters: Player[]): Player[] {
  const starterIds = new Set(starters.map((p) => p.id));
  return players.filter((p) => !starterIds.has(p.id));
}
