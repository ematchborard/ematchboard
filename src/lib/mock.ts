import type {
  Match,
  MatchDetail,
  MatchGame,
  MatchStatus,
  Player,
  Serie,
  Team,
  TeamDetail,
  Tournament,
} from "./types";

// APIトークン未設定のときに表示するサンプルデータ。
// 現在時刻を基準に「昨日の結果 / 進行中 / 今日・明日の予定」を動的に生成するので、
// いつ開いてもそれらしい画面になる。
// ID規約: VALORANT系は1000番台、LoL系は2000番台(チーム=base+0..7、リーグ=base、大会=base+1)

const HOUR = 3_600_000;

const TEAMS: Record<string, { name: string; acronym: string }[]> = {
  valorant: [
    { name: "Sentinels", acronym: "SEN" },
    { name: "Paper Rex", acronym: "PRX" },
    { name: "Fnatic", acronym: "FNC" },
    { name: "DRX", acronym: "DRX" },
    { name: "G2 Esports", acronym: "G2" },
    { name: "Team Heretics", acronym: "TH" },
    { name: "EDward Gaming", acronym: "EDG" },
    { name: "LOUD", acronym: "LLL" },
  ],
  lol: [
    { name: "T1", acronym: "T1" },
    { name: "Gen.G", acronym: "GEN" },
    { name: "G2 Esports", acronym: "G2" },
    { name: "Fnatic", acronym: "FNC" },
    { name: "Bilibili Gaming", acronym: "BLG" },
    { name: "Hanwha Life Esports", acronym: "HLE" },
    { name: "Cloud9", acronym: "C9" },
    { name: "Movistar KOI", acronym: "KOI" },
  ],
};

const EVENTS: Record<string, { league: string; tournament: string; stream: string }> = {
  valorant: {
    league: "VCT Masters",
    tournament: "Playoffs",
    stream: "https://www.twitch.tv/valorant",
  },
  lol: {
    league: "LEC Summer",
    tournament: "Week 3",
    stream: "https://www.twitch.tv/riotgames",
  },
};

function gameForMockId(id: number): string {
  return id >= 2000 ? "lol" : "valorant";
}

function baseFor(gameSlug: string): number {
  return gameSlug === "lol" ? 2000 : 1000;
}

function mockTeams(gameSlug: string): Team[] {
  const seeds = TEAMS[gameSlug] ?? TEAMS.valorant;
  const base = baseFor(gameSlug);
  return seeds.map((s, i) => ({
    id: base + i,
    name: s.name,
    acronym: s.acronym,
    image_url: null,
  }));
}

interface Spec {
  offsetHours: number;
  status: MatchStatus;
  score?: [number, number];
  hasStream?: boolean;
}

const SPECS: Spec[] = [
  { offsetHours: -26, status: "finished", score: [2, 0] },
  { offsetHours: -22, status: "finished", score: [2, 1] },
  { offsetHours: -5, status: "finished", score: [1, 2] },
  { offsetHours: -0.7, status: "running", score: [1, 0], hasStream: true },
  { offsetHours: 3, status: "not_started" },
  { offsetHours: 6, status: "not_started" },
  { offsetHours: 21, status: "not_started" },
  { offsetHours: 25, status: "not_started" },
  { offsetHours: 28, status: "not_started" },
];

export function mockMatches(gameSlug: string): Match[] {
  const teams = mockTeams(gameSlug);
  const event = EVENTS[gameSlug] ?? EVENTS.valorant;
  const base = baseFor(gameSlug);
  const now = Date.now();

  return SPECS.map((spec, i) => {
    const a = teams[(2 * i) % teams.length];
    const b = teams[(2 * i + 3) % teams.length];
    const results = spec.score
      ? [
          { team_id: a.id, score: spec.score[0] },
          { team_id: b.id, score: spec.score[1] },
        ]
      : [];
    const winner_id =
      spec.status === "finished" && spec.score
        ? spec.score[0] > spec.score[1]
          ? a.id
          : b.id
        : null;

    return {
      id: base + 100 + i,
      name: `Round ${i + 1}: ${a.acronym} vs ${b.acronym}`,
      status: spec.status,
      begin_at: new Date(now + spec.offsetHours * HOUR).toISOString(),
      number_of_games: 3,
      league: { id: base, name: event.league, image_url: null },
      serie: { id: base + 2, full_name: null },
      tournament: { id: base + 1, name: event.tournament, tier: "s" },
      opponents: [{ opponent: a }, { opponent: b }],
      results,
      winner_id,
      streams_list: spec.hasStream
        ? [{ main: true, official: true, language: "en", raw_url: event.stream }]
        : [],
    };
  });
}

export function mockTournament(id: number): Tournament | null {
  const gameSlug = gameForMockId(id);
  const base = baseFor(gameSlug);
  if (id !== base + 1) return null;
  const event = EVENTS[gameSlug];
  const now = Date.now();
  return {
    id,
    name: event.tournament,
    tier: "s",
    begin_at: new Date(now - 72 * HOUR).toISOString(),
    end_at: new Date(now + 96 * HOUR).toISOString(),
    league: { id: base, name: event.league, image_url: null },
    serie: { id: base + 2, full_name: null },
  };
}

export function mockTournamentMatches(id: number): Match[] {
  return mockMatches(gameForMockId(id)).filter((m) => m.tournament.id === id);
}

export function mockSerie(id: number): Serie | null {
  const gameSlug = gameForMockId(id);
  const base = baseFor(gameSlug);
  if (id !== base + 2) return null;
  const event = EVENTS[gameSlug];
  const now = Date.now();
  return {
    id,
    full_name: null,
    begin_at: new Date(now - 72 * HOUR).toISOString(),
    end_at: new Date(now + 96 * HOUR).toISOString(),
    league: { id: base, name: event.league, image_url: null },
  };
}

export function mockSerieTournaments(id: number): Tournament[] {
  const base = baseFor(gameForMockId(id));
  const stage = mockTournament(base + 1);
  return stage ? [stage] : [];
}

export function mockSerieMatches(id: number): Match[] {
  return mockMatches(gameForMockId(id));
}

const MOCK_PLAYER_NAMES = ["Ace", "Nova", "Frost", "Viper", "Sage"];
const LOL_ROLES = ["top", "jun", "mid", "adc", "sup"];

export function mockTeam(id: number): TeamDetail | null {
  const gameSlug = gameForMockId(id);
  const teams = mockTeams(gameSlug);
  const team = teams.find((t) => t.id === id);
  if (!team) return null;
  const players: Player[] = MOCK_PLAYER_NAMES.map((name, i) => ({
    id: id * 10 + i,
    name,
    first_name: "Sample",
    last_name: `Player ${i + 1}`,
    image_url: null,
    nationality: "US",
    role: gameSlug === "lol" ? LOL_ROLES[i] : null,
  }));
  return { ...team, location: "US", players };
}

export function mockMatchDetail(id: number): MatchDetail | null {
  const all = [...mockMatches("valorant"), ...mockMatches("lol")];
  const m = all.find((x) => x.id === id);
  if (!m) return null;
  const [a, b] = [m.opponents[0]?.opponent, m.opponents[1]?.opponent];
  const scoreA = m.results.find((r) => r.team_id === a?.id)?.score ?? 0;
  const scoreB = m.results.find((r) => r.team_id === b?.id)?.score ?? 0;
  const games: MatchGame[] = [];
  for (let i = 0; i < scoreA; i++)
    games.push({ id: id * 10 + games.length, position: games.length + 1, status: "finished", winner: { id: a?.id ?? null } });
  for (let i = 0; i < scoreB; i++)
    games.push({ id: id * 10 + games.length, position: games.length + 1, status: "finished", winner: { id: b?.id ?? null } });
  while (games.length < m.number_of_games && m.status !== "finished")
    games.push({ id: id * 10 + games.length, position: games.length + 1, status: "not_started", winner: null });
  return { ...m, games };
}

export function mockTeamMatches(id: number): { upcoming: Match[]; past: Match[] } {
  const all = mockMatches(gameForMockId(id)).filter((m) =>
    m.opponents.some((o) => o.opponent.id === id)
  );
  return {
    upcoming: all.filter((m) => m.status === "not_started" || m.status === "running"),
    past: all.filter((m) => m.status === "finished").reverse(),
  };
}
