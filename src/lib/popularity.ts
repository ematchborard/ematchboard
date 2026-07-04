// 人気大会を上に表示するためのランキング。
// 配列の前方にあるキーワードほど優先度が高い(リーグ名+シリーズ名に部分一致)。
// PandaScore の tournament.tier (s > a > b > c > d) があれば同点時の補助に使う。

// 全ゲーム共通で最優先の大会 (Esports World Cup など)
const GLOBAL_KEYWORDS = ["esports world cup", "ewc"];

const KEYWORDS: Record<string, string[]> = {
  lol: [
    "mid-season invitational",
    "msi",
    "worlds",
    "first stand",
    "lck",
    "lpl",
    "lec",
    "lta",
    "lcs",
    "cblol",
    "ljl",
  ],
  valorant: [
    "champions",
    "masters",
    "vct americas",
    "vct emea",
    "vct pacific",
    "vct china",
    "vct",
    "game changers",
    "challengers",
  ],
  csgo: [
    "major",
    "iem katowice",
    "iem cologne",
    "blast premier",
    "esl pro league",
    "iem",
    "blast",
    "esl challenger",
  ],
  dota2: [
    "the international",
    "riyadh masters",
    "esl one",
    "dreamleague",
    "blast slam",
    "pgl wallachia",
  ],
  ow: ["owcs", "overwatch champions", "midseason championship", "champions clash"],
  r6siege: ["six invitational", "major", "blast r6"],
  rl: ["rlcs", "world championship", "major"],
  mlbb: ["m6", "m7", "world championship", "msc", "mpl"],
  pubg: ["pgc", "global championship", "pgs", "global series"],
  codmw: ["cdl", "call of duty league", "champs", "major"],
  fifa: ["fc pro", "world championship", "fifae"],
  "starcraft-2": ["iem", "gsl", "esl pro tour"],
};

const TIER_RANK: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };

// 選択言語に対応する地域の大会を少し上に押し上げるためのキーワード
const REGION_KEYWORDS: Record<string, string[]> = {
  ja: ["japan", "ljl", "vcj", "japanese"],
  ko: ["korea", "lck", "korean"],
  zh: ["china", "lpl", "chinese"],
  pt: ["brazil", "brasil", "cblol"],
  es: ["latam", "latin america", "spain", "spanish"],
  fr: ["france", "lfl", "french"],
  de: ["germany", "prime league", "german"],
};

// 小さいほど人気(上に表示)。キーワード不一致は最下位グループ扱い。
// lang を渡すと、その言語の地域大会が同格の大会より少し上に来る。
export function leaguePriority(
  gameSlug: string,
  leagueAndSerieName: string,
  tier?: string | null,
  lang?: string
): number {
  const keywords = [...GLOBAL_KEYWORDS, ...(KEYWORDS[gameSlug] ?? [])];
  const name = leagueAndSerieName.toLowerCase();
  const kwIndex = keywords.findIndex((k) => name.includes(k));
  const kwScore = kwIndex === -1 ? keywords.length : kwIndex;
  const tierScore = tier ? (TIER_RANK[tier.toLowerCase()] ?? 5) : 5;
  const regionWords = lang ? (REGION_KEYWORDS[lang] ?? []) : [];
  const regionBoost = regionWords.some((k) => name.includes(k)) ? 4 : 0;
  return kwScore * 10 + tierScore - regionBoost;
}
