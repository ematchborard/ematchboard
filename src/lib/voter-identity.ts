import { cookies } from "next/headers";

// 投票者の識別。voter_hashは「httpOnly cookieのランダムID単体 + サーバー側
// ペッパー」だけから作ること(ratings_init.sql参照)。日替わりIPハッシュを混ぜると
// 同じ端末が日をまたいで再投票できてしまうため、IPは別のip_hash列(レート制限専用、
// 日替わりソルトでOK)として完全に分離している。
const VOTER_COOKIE = "em_voter";
const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function pepper(): string {
  const p = process.env.RATINGS_PEPPER;
  if (p) return p;
  if (process.env.NODE_ENV !== "production") return "dev-only-insecure-pepper";
  throw new Error("RATINGS_PEPPER is not set");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 投票(POST)でのみ呼ぶ。既存cookieが無ければ新規発行する
export async function getOrCreateVoterId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VOTER_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(VOTER_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: VOTER_COOKIE_MAX_AGE,
    path: "/",
  });
  return id;
}

// 集計(GET)専用の読み取りのみ。無ければnull(cookieを新規発行しない)
export async function readVoterId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VOTER_COOKIE)?.value ?? null;
}

export function voterHash(voterId: string): Promise<string> {
  return sha256Hex(`voter:${voterId}:${pepper()}`);
}

// レート制限専用。UTC日付で日替わりのため長期追跡はできない(意図的)
export function ipHash(ip: string): Promise<string> {
  const dayKey = new Date().toISOString().slice(0, 10);
  return sha256Hex(`ip:${ip}:${dayKey}:${pepper()}`);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
