import { NextResponse, type NextRequest } from "next/server";
import { ratingsDb } from "@/lib/ratings-db";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientIp, getOrCreateVoterId, ipHash, readVoterId, voterHash } from "@/lib/voter-identity";

// ファン採点(ステップ2): 投票(POST)と集計(GET)のみ。コメント・いいね・通報は
// ステップ4で追加する。ロスター(どのplayer_idが有効か)はPandaScoreを叩かずに
// 済ませたいので、このAPIは「投票があったplayer_idの集計を返す」だけで、
// 大会のロスター一覧そのものは持たない(画面側で表示する選手一覧はステップ3で
// 別途用意する)。
//
// 2026-10-22、終了済み試合ページ自体をcustom-worker.tsでCache API(7日間)に
// フルページキャッシュするようになったため、このAPIは明示的に
// Cache-Control: no-storeを付けている。平均点・自分の投票・Cookie発行は
// 全てこのAPI経由(ページのHTMLには一切埋め込まない)なので、試合ページが
// 他の訪問者とキャッシュ共有されても個人情報が混ざることはない。

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_VOTES = 20;

interface VoteBody {
  matchId?: unknown;
  playerId?: unknown;
  score?: unknown;
  turnstileToken?: unknown;
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function json(data: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(data, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const matchIdParam = request.nextUrl.searchParams.get("matchId");
  const matchId = matchIdParam ? Number(matchIdParam) : NaN;
  if (!isPositiveInt(matchId)) {
    return json({ error: "matchId is required" }, { status: 400 });
  }

  const db = await ratingsDb();
  if (!db) {
    return json({ error: "ratings database unavailable" }, { status: 503 });
  }

  const [{ results }, totalVotersRow] = await Promise.all([
    db
      .prepare(
        "SELECT player_id, COUNT(*) as count, AVG(score) as average FROM ratings WHERE match_id = ? GROUP BY player_id"
      )
      .bind(matchId)
      .all<{ player_id: number; count: number; average: number }>(),
    db
      .prepare("SELECT COUNT(DISTINCT voter_hash) as count FROM ratings WHERE match_id = ?")
      .bind(matchId)
      .first<{ count: number }>(),
  ]);

  const players = results.map((r) => ({
    playerId: r.player_id,
    count: r.count,
    average: Math.round(r.average * 10) / 10,
  }));

  const voterId = await readVoterId();
  let yourVotes: Record<number, number> = {};
  if (voterId) {
    const hash = await voterHash(voterId);
    const { results: own } = await db
      .prepare("SELECT player_id, score FROM ratings WHERE match_id = ? AND voter_hash = ?")
      .bind(matchId, hash)
      .all<{ player_id: number; score: number }>();
    yourVotes = Object.fromEntries(own.map((r) => [r.player_id, r.score]));
  }

  return json({ matchId, players, yourVotes, totalVoters: totalVotersRow?.count ?? 0 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as VoteBody | null;
  if (!body) {
    return json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { matchId, playerId, score, turnstileToken } = body;
  if (!isPositiveInt(matchId) || !isPositiveInt(playerId)) {
    return json({ error: "matchId and playerId must be positive integers" }, { status: 400 });
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return json({ error: "score must be an integer from 1 to 10" }, { status: 400 });
  }
  if (typeof turnstileToken !== "string" || turnstileToken.length === 0) {
    return json({ error: "turnstileToken is required" }, { status: 400 });
  }

  const db = await ratingsDb();
  if (!db) {
    return json({ error: "ratings database unavailable" }, { status: 503 });
  }

  const ip = clientIp(request);
  const ipHashValue = await ipHash(ip);

  const { count: recentVotes } = (await db
    .prepare(
      `SELECT COUNT(*) as count FROM ratings WHERE ip_hash = ? AND created_at > datetime('now', '-${RATE_LIMIT_WINDOW_MINUTES} minutes')`
    )
    .bind(ipHashValue)
    .first<{ count: number }>()) ?? { count: 0 };
  if (recentVotes >= RATE_LIMIT_MAX_VOTES) {
    return json({ error: "too many votes, please try again later" }, { status: 429 });
  }

  const verified = await verifyTurnstile(turnstileToken, ip);
  if (!verified) {
    return json({ error: "turnstile verification failed" }, { status: 403 });
  }

  const voterId = await getOrCreateVoterId();
  const hash = await voterHash(voterId);

  await db
    .prepare(
      `INSERT INTO ratings (match_id, player_id, voter_hash, ip_hash, score, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(match_id, player_id, voter_hash)
       DO UPDATE SET score = excluded.score, ip_hash = excluded.ip_hash, created_at = datetime('now')`
    )
    .bind(matchId, playerId, hash, ipHashValue, score)
    .run();

  const aggregate = (await db
    .prepare("SELECT COUNT(*) as count, AVG(score) as average FROM ratings WHERE match_id = ? AND player_id = ?")
    .bind(matchId, playerId)
    .first<{ count: number; average: number }>()) ?? { count: 0, average: 0 };

  return json({
    matchId,
    playerId,
    yourScore: score,
    count: aggregate.count,
    average: Math.round(aggregate.average * 10) / 10,
  });
}
