import aiRatingsData from "@/data/ai-ratings.json";
import type { Player } from "./types";

// 「AI評価(参考)」— ファン採点とは完全に別枠の参考値。試合レポート等をもとに
// 手動でdata/ai-ratings.jsonへ追記する(自動取得はしない)。
// ファン採点の平均・MVP計算には一切使わない(/api/ratingsのD1データのみを使う)。
//
// 形式:
// {
//   "<matchId>": {
//     "note": "試合レポートをもとにした参考値",
//     "players": { "<選手名>": { "score": 7.5, "reason": "1本目にペンタキル" } }
//   }
// }
// 選手名はroster-overrides.tsと同じく、PandaScoreのplayer名と大文字小文字を
// 無視して照合する。該当するmatchIdが無い試合ではAI評価は一切表示しない

export interface AiPlayerRating {
  score: number;
  reason: string;
}

export interface AiMatchRating {
  note: string;
  players: Record<string, AiPlayerRating>;
}

const aiRatings = aiRatingsData as Record<string, AiMatchRating>;

export function getAiRatingForMatch(matchId: number): AiMatchRating | null {
  return aiRatings[String(matchId)] ?? null;
}

// スタメン(teamAPlayers+teamBPlayers)に対して、名前が一致するAI評価を
// player_idをキーにしたマップへ解決する。一致しない選手名はコンソールに警告を出す
// (JSON側のタイプミスや控えに回った選手に気づけるようにするため)
export function resolveAiRatings(
  matchRating: AiMatchRating | null,
  players: Player[]
): Record<number, AiPlayerRating> {
  if (!matchRating) return {};
  const byNameLower = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const result: Record<number, AiPlayerRating> = {};
  for (const [name, rating] of Object.entries(matchRating.players)) {
    const player = byNameLower.get(name.toLowerCase());
    if (player) {
      result[player.id] = rating;
    } else {
      console.warn(`[ai-ratings] player "${name}" not found in starting five, skipping`);
    }
  }
  return result;
}
