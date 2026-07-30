// 対応ゲームの一覧。タイトルを追加するときはここに1行足すだけ。
// slug は URL のパスと PandaScore API のルート名 (/{slug}/matches) を兼ねるので、
// PandaScore のルート名と一致させること(全slugはAPIで実在確認済み)。

export type GameCategory =
  | "FPS"
  | "MOBA"
  | "Battle Royale"
  | "Fighting"
  | "Racing & Sports"
  | "Strategy"
  | "Other";

export interface GameConfig {
  slug: string;
  name: string;
  short: string; // サイドバーのアイコン用略称(ロゴ画像が無いときのフォールバック表示)
  accent: string; // タブ/サイドバーのアクティブ色
  logo?: string; // /public 配下の自前ホストロゴ画像パス。無ければshort+accentの色付きバッジにフォールバック
  category: GameCategory; // サイドバーの「All games」内でのジャンル分け
  popular?: boolean; // true = サイドバーの「Popular Games」に常時表示(未フォロー時)
  // true = PandaScore非対応のバトロワ系など。試合単位のデータは無く、
  // 大会スケジュール(lib/manual-events.ts で手動管理)だけを表示する
  eventsOnly?: boolean;
}

export const GAMES: GameConfig[] = [
  { slug: "valorant", name: "VALORANT", short: "VAL", accent: "#ff4655", category: "FPS", popular: true, logo: "/game-logos/valorant.svg" },
  { slug: "lol", name: "League of Legends", short: "LoL", accent: "#0ac8b9", category: "MOBA", popular: true, logo: "/game-logos/lol.svg" },
  { slug: "csgo", name: "Counter-Strike 2", short: "CS2", accent: "#f5a623", category: "FPS", popular: true, logo: "/game-logos/csgo.svg" },
  { slug: "dota2", name: "Dota 2", short: "DOTA", accent: "#c23c2a", category: "MOBA", popular: true, logo: "/game-logos/dota2.svg" },
  { slug: "ow", name: "Overwatch 2", short: "OW", accent: "#fa9c1e", category: "FPS", popular: true, logo: "/game-logos/ow.svg" },
  { slug: "r6siege", name: "Rainbow Six Siege", short: "R6", accent: "#35a8dd", category: "FPS" },
  { slug: "rl", name: "Rocket League", short: "RL", accent: "#1f8efa", category: "Racing & Sports", popular: true, logo: "/game-logos/rl.svg" },
  { slug: "mlbb", name: "Mobile Legends", short: "MLBB", accent: "#4a7dff", category: "MOBA" },
  { slug: "pubg", name: "PUBG: BATTLEGROUNDS", short: "PUBG", accent: "#f2a900", category: "Battle Royale" },
  { slug: "pubgm", name: "PUBG Mobile", short: "PUBGM", accent: "#ff8a00", category: "Battle Royale", eventsOnly: true },
  { slug: "codmw", name: "Call of Duty", short: "COD", accent: "#7ac142", category: "FPS", popular: true, logo: "/game-logos/codmw.svg" },
  { slug: "fifa", name: "EA Sports FC", short: "FC", accent: "#2ecc71", category: "Racing & Sports" },
  { slug: "starcraft-2", name: "StarCraft 2", short: "SC2", accent: "#8fb8ff", category: "Strategy" },
  // Events only (大会スケジュールのみ)
  { slug: "apex", name: "Apex Legends", short: "APEX", accent: "#da292a", category: "Battle Royale", popular: true, eventsOnly: true, logo: "/game-logos/apex.svg" },
  { slug: "fortnite", name: "Fortnite", short: "FN", accent: "#9d59f5", category: "Battle Royale", popular: true, eventsOnly: true, logo: "/game-logos/fortnite.svg" },
  { slug: "tft", name: "Teamfight Tactics", short: "TFT", accent: "#f7a833", category: "Strategy", eventsOnly: true },
  { slug: "mario-kart", name: "Mario Kart World", short: "MK", accent: "#e60012", category: "Racing & Sports", eventsOnly: true },
  { slug: "identity-v", name: "Identity V", short: "IDV", accent: "#a78bfa", category: "Other", eventsOnly: true },
  { slug: "smash", name: "Super Smash Bros. Ultimate", short: "SSBU", accent: "#e64a3b", category: "Fighting", eventsOnly: true },
  { slug: "sf6", name: "Street Fighter 6", short: "SF6", accent: "#2ea8e0", category: "Fighting", eventsOnly: true },
  { slug: "pokemon", name: "Pokémon (WCS)", short: "PKM", accent: "#ffcb05", category: "Strategy", eventsOnly: true },
  { slug: "splatoon", name: "Splatoon 3", short: "SPL", accent: "#b3f52b", category: "FPS", eventsOnly: true },
  { slug: "puyo-puyo", name: "Puyo Puyo", short: "PUYO", accent: "#4fc44f", category: "Other", eventsOnly: true },
];

export const DEFAULT_GAME = GAMES[0];

export function getGame(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug);
}
