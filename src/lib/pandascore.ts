import type {
  BracketMatch,
  Match,
  MatchDetail,
  Serie,
  Standing,
  TeamDetail,
  Tournament,
} from "./types";
import {
  mockMatchDetail,
  mockMatches,
  mockSerie,
  mockSerieMatches,
  mockSerieTournaments,
  mockTeam,
  mockTeamMatches,
  mockTournament,
  mockTournamentMatches,
} from "./mock";

// PandaScore クライアント。トークンはサーバー側の環境変数からのみ読む
// (ブラウザに漏れると無料枠を他人に消費されるため、クライアントには絶対に渡さない)。
// トークン未設定ならモックデータにフォールバックするので、キーなしでも開発できる。

const API_BASE = "https://api.pandascore.co";

export function hasApiToken(): boolean {
  return Boolean(process.env.PANDASCORE_TOKEN);
}

// プロセス内5分キャッシュ。Cloudflare WorkersではNextのfetchキャッシュが
// 効かない構成があるため、環境を問わない保険としてメモリでも持つ(二重でも無害)
const memCache = new Map<string, { expires: number; data: unknown }>();
const MEM_TTL_MS = 5 * 60_000;

async function psFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${query ? `?${query}` : ""}`;

  const hit = memCache.get(url);
  if (hit && hit.expires > Date.now()) return hit.data as T;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.PANDASCORE_TOKEN}`,
      Accept: "application/json",
    },
    // 5分キャッシュ: 何人アクセスしても PandaScore へのリクエストは5分に1回で済む
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`PandaScore error ${res.status} for ${path}`);
  }
  const data = (await res.json()) as T;

  memCache.set(url, { expires: Date.now() + MEM_TTL_MS, data });
  if (memCache.size > 500) {
    for (const [k, v] of memCache) {
      if (v.expires < Date.now()) memCache.delete(k);
    }
  }
  return data;
}

export async function getMatches(
  gameSlug: string,
  from: Date,
  to: Date
): Promise<Match[]> {
  if (!hasApiToken()) {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return mockMatches(gameSlug).filter((m) => {
      const t = m.begin_at ? Date.parse(m.begin_at) : NaN;
      return t >= fromMs && t <= toMs;
    });
  }
  // 月表示など期間が長いと100件を超えるのでページを追う(最大5ページ=500件)
  const all: Match[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await psFetch<Match[]>(`/${gameSlug}/matches`, {
      "range[begin_at]": `${from.toISOString()},${to.toISOString()}`,
      sort: "begin_at",
      per_page: "100",
      page: String(page),
    });
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function getTournament(id: number): Promise<Tournament | null> {
  if (!hasApiToken()) return mockTournament(id);
  try {
    return await psFetch<Tournament>(`/tournaments/${id}`);
  } catch {
    return null;
  }
}

export async function getTournamentMatches(id: number): Promise<Match[]> {
  if (!hasApiToken()) return mockTournamentMatches(id);
  try {
    return await psFetch<Match[]>(`/tournaments/${id}/matches`, {
      sort: "begin_at",
      per_page: "100",
    });
  } catch {
    return [];
  }
}

// リーグ戦形式の大会のみ順位表が返る。無い形式(トーナメント表のみ等)は null
export async function getTournamentStandings(
  id: number
): Promise<Standing[] | null> {
  if (!hasApiToken()) return null;
  try {
    const standings = await psFetch<Standing[]>(
      `/tournaments/${id}/standings`,
      { per_page: "50" }
    );
    return standings.length > 0 ? standings : null;
  } catch {
    return null;
  }
}

// 試合詳細 (マップごとの結果を含む)
export async function getMatch(id: number): Promise<MatchDetail | null> {
  if (!hasApiToken()) return mockMatchDetail(id);
  try {
    return await psFetch<MatchDetail>(`/matches/${id}`);
  } catch {
    return null;
  }
}

// チームの直近の過去試合 (フォーム表示・過去対戦成績の計算用)
export async function getTeamRecentMatches(id: number): Promise<Match[]> {
  if (!hasApiToken()) return mockTeamMatches(id).past;
  try {
    return await psFetch<Match[]>(`/matches/past`, {
      "filter[opponent_id]": String(id),
      sort: "-begin_at",
      per_page: "30",
    });
  } catch {
    return [];
  }
}

// シリーズ = 大会の1開催全体 (EWC 2026 など)
export async function getSerie(id: number): Promise<Serie | null> {
  if (!hasApiToken()) return mockSerie(id);
  try {
    return await psFetch<Serie>(`/series/${id}`);
  } catch {
    return null;
  }
}

// シリーズ配下のステージ一覧 (Group A / Group B / Playoffs など)
export async function getSerieTournaments(id: number): Promise<Tournament[]> {
  if (!hasApiToken()) return mockSerieTournaments(id);
  try {
    return await psFetch<Tournament[]>(`/series/${id}/tournaments`, {
      per_page: "50",
    });
  } catch {
    return [];
  }
}

// シリーズ全体の全試合 (全ステージ横断)
export async function getSerieMatches(id: number): Promise<Match[]> {
  if (!hasApiToken()) return mockSerieMatches(id);
  const all: Match[] = [];
  for (let page = 1; page <= 3; page++) {
    let batch: Match[];
    try {
      batch = await psFetch<Match[]>(`/series/${id}/matches`, {
        sort: "begin_at",
        per_page: "100",
        page: String(page),
      });
    } catch {
      break;
    }
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

// ブラケット(トーナメント表)構造。勝ち上がり関係が無い=リーグ形式なら null を返し、
// 大会ページ側でセクションごと非表示にする
export async function getTournamentBrackets(
  id: number
): Promise<BracketMatch[] | null> {
  if (!hasApiToken()) return null;
  try {
    const brackets = await psFetch<BracketMatch[]>(
      `/tournaments/${id}/brackets`,
      { per_page: "100" }
    );
    const hasLinks = brackets.some((b) => (b.previous_matches ?? []).length > 0);
    return hasLinks ? brackets : null;
  } catch {
    return null;
  }
}

export async function getTeam(id: number): Promise<TeamDetail | null> {
  if (!hasApiToken()) return mockTeam(id);
  try {
    return await psFetch<TeamDetail>(`/teams/${id}`);
  } catch {
    return null;
  }
}

export async function getTeamMatches(
  id: number
): Promise<{ upcoming: Match[]; past: Match[] }> {
  if (!hasApiToken()) return mockTeamMatches(id);
  const opponentFilter = { "filter[opponent_id]": String(id) };
  const safe = (p: Promise<Match[]>) => p.catch(() => [] as Match[]);
  const [running, upcoming, past] = await Promise.all([
    safe(psFetch<Match[]>("/matches/running", { ...opponentFilter, per_page: "5" })),
    safe(psFetch<Match[]>("/matches/upcoming", { ...opponentFilter, sort: "begin_at", per_page: "5" })),
    safe(psFetch<Match[]>("/matches/past", { ...opponentFilter, sort: "-begin_at", per_page: "5" })),
  ]);
  return { upcoming: [...running, ...upcoming], past };
}
