// PandaScore の match オブジェクトのうち、このアプリで使うフィールドだけを型にしたもの
// https://developers.pandascore.co/reference/get_matches

export type MatchStatus =
  | "not_started"
  | "running"
  | "finished"
  | "canceled"
  | "postponed";

export interface Team {
  id: number;
  name: string;
  acronym: string | null;
  image_url: string | null;
}

export interface Player {
  id: number;
  name: string; // ハンドルネーム
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  nationality: string | null;
  role: string | null; // LoLのレーンなど。ゲームによっては null
}

export interface TeamDetail extends Team {
  location: string | null;
  players: Player[];
}

export interface Tournament {
  id: number;
  name: string; // ステージ名 (例: "Playoffs")
  tier: string | null;
  begin_at: string | null;
  end_at: string | null;
  league: { id: number; name: string; image_url: string | null };
  serie: { id: number; full_name: string | null };
}

// シリーズ = 大会の1開催全体 (例: "EWC 2026"、"LEC Summer 2026")。
// この下に複数のトーナメント(Group A / Playoffs などのステージ)がぶら下がる
export interface Serie {
  id: number;
  full_name: string | null;
  begin_at: string | null;
  end_at: string | null;
  league: { id: number; name: string; image_url: string | null };
}

// /tournaments/:id/standings のレスポンス。大会形式によっては wins/losses が無い
export interface Standing {
  rank: number;
  team: Team;
  wins?: number;
  losses?: number;
}

// 試合詳細 (/matches/:id)。games = マップ/ゲームごとの結果
export interface MatchGame {
  id: number;
  position: number;
  status: string;
  winner: { id: number | null } | null;
}

export interface MatchDetail extends Match {
  games: MatchGame[];
}

// /tournaments/:id/brackets のレスポンス。league等のネストは無い代わりに
// previous_matches で勝ち上がり関係(どの試合の勝者/敗者が来るか)が取れる
export interface BracketMatch {
  id: number;
  name: string;
  status: MatchStatus;
  begin_at: string | null;
  number_of_games: number;
  opponents: { opponent: Team }[];
  results: { team_id: number; score: number }[];
  winner_id: number | null;
  previous_matches: { match_id: number; type: string }[];
}

export interface Match {
  id: number;
  name: string; // 例: "Upper bracket semifinal: RBN vs MISA"
  status: MatchStatus;
  begin_at: string | null; // ISO 8601 (UTC)
  number_of_games: number;
  league: { id: number; name: string; image_url: string | null };
  serie: { id: number; full_name: string | null };
  tournament: { id: number; name: string; tier?: string | null };
  opponents: { opponent: Team }[];
  results: { team_id: number; score: number }[];
  winner_id: number | null;
  streams_list: {
    main: boolean;
    official: boolean;
    language: string;
    raw_url: string | null;
  }[];
}
