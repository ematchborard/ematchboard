// 対応ゲームの一覧。タイトルを追加するときはここに1行足すだけ。
// slug は URL のパスと PandaScore API のルート名 (/{slug}/matches) を兼ねるので、
// PandaScore のルート名と一致させること(全slugはAPIで実在確認済み)。

export interface GameConfig {
  slug: string;
  name: string;
  short: string; // サイドバーのアイコン用略称
  accent: string; // タブ/サイドバーのアクティブ色
}

export const GAMES: GameConfig[] = [
  { slug: "valorant", name: "VALORANT", short: "VAL", accent: "#ff4655" },
  { slug: "lol", name: "League of Legends", short: "LoL", accent: "#0ac8b9" },
  { slug: "csgo", name: "Counter-Strike 2", short: "CS2", accent: "#f5a623" },
  { slug: "dota2", name: "Dota 2", short: "DOTA", accent: "#c23c2a" },
  { slug: "ow", name: "Overwatch 2", short: "OW2", accent: "#fa9c1e" },
  { slug: "r6siege", name: "Rainbow Six Siege", short: "R6", accent: "#35a8dd" },
  { slug: "rl", name: "Rocket League", short: "RL", accent: "#1f8efa" },
  { slug: "mlbb", name: "Mobile Legends", short: "MLBB", accent: "#4a7dff" },
  { slug: "pubg", name: "PUBG", short: "PUBG", accent: "#f2a900" },
  { slug: "codmw", name: "Call of Duty", short: "COD", accent: "#7ac142" },
  { slug: "fifa", name: "EA Sports FC", short: "FC", accent: "#2ecc71" },
  { slug: "starcraft-2", name: "StarCraft 2", short: "SC2", accent: "#8fb8ff" },
];

export const DEFAULT_GAME = GAMES[0];

export function getGame(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug);
}
