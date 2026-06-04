/**
 * Fixture & Stats Fetcher
 * Fetches data from API-Sports (via RapidAPI).
 * Falls back to seeded mock data when API keys are not configured.
 *
 * Required env vars:
 *   RAPIDAPI_KEY  — your RapidAPI key
 */

import type { Fixture, PlayerStats, MatchResult, TennisSurface } from "./types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const BASE_URL = "https://api-tennis.p.rapidapi.com";

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T | null> {
  if (!RAPIDAPI_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "api-tennis.p.rapidapi.com",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ─── Fetch Today's Fixtures ───────────────────────────────────────────────────

export async function fetchTodayFixtures(
  sport: "tennis" | "table-tennis"
): Promise<Fixture[]> {
  const today = new Date().toISOString().split("T")[0];

  // Try live API first
  const data = await apiFetch<{ result: RawGame[] }>(
    `/games?date=${today}&sport=${sport === "tennis" ? "Tennis" : "Table Tennis"}`
  );

  if (data?.result?.length) {
    return data.result.map((g) => mapRawGame(g, sport));
  }

  // Fallback: return rich mock fixtures for demo / local dev
  console.warn(`[fetcher] Using mock fixtures for ${sport}`);
  return getMockFixtures(sport);
}

// ─── Raw API Types ────────────────────────────────────────────────────────────

interface RawGame {
  game_id: string;
  league_name: string;
  round?: string;
  event_home_team: string;
  event_away_team: string;
  event_date: string;
  event_time?: string;
  surface?: string;
}

function mapRawGame(g: RawGame, sport: "tennis" | "table-tennis"): Fixture {
  const p1 = buildMockPlayer(g.event_home_team);
  const p2 = buildMockPlayer(g.event_away_team);
  return {
    id: g.game_id,
    sport,
    tournament: g.league_name,
    round: g.round,
    player1: p1,
    player2: p2,
    surface: mapSurface(g.surface),
    scheduledAt: `${g.event_date}T${g.event_time ?? "12:00"}:00Z`,
    headToHead: { player1Id: p1.id, player2Id: p2.id, matches: [] },
  };
}

function mapSurface(s?: string): TennisSurface | undefined {
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower.includes("clay")) return "clay";
  if (lower.includes("grass")) return "grass";
  if (lower.includes("indoor")) return "indoor";
  return "hard";
}

// ─── Mock Data (rich, realistic) ──────────────────────────────────────────────

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildMockPlayer(name: string): PlayerStats {
  const rng = seedRandom(name.charCodeAt(0) * 37 + name.length * 13);
  const elo = Math.round(1400 + rng() * 600);

  const recentForm: MatchResult[] = Array.from({ length: 5 }, (_, i) => ({
    opponentId: `opp-${i}`,
    won: rng() > 0.4,
    setsPlayed: Math.ceil(2 + rng() * 3),
    setsWon: Math.ceil(1 + rng() * 2),
    setsLost: Math.ceil(rng() * 2),
    date: new Date(Date.now() - i * 7 * 86400000).toISOString(),
  }));

  return {
    id: name.toLowerCase().replace(/\s/g, "-"),
    name,
    eloRating: elo,
    eloSurface: {
      hard: elo + Math.round((rng() - 0.5) * 80),
      clay: elo + Math.round((rng() - 0.5) * 80),
      grass: elo + Math.round((rng() - 0.5) * 80),
      indoor: elo + Math.round((rng() - 0.5) * 80),
    },
    recentForm,
    setsWon: Math.round(rng() * 200 + 50),
    setsLost: Math.round(rng() * 150 + 30),
    totalMatches: Math.round(rng() * 120 + 20),
    avgSetsPerMatch: 2 + rng() * 1.5,
  };
}

function getMockFixtures(sport: "tennis" | "table-tennis"): Fixture[] {
  const tennisTournaments = [
    "Wimbledon",
    "US Open",
    "Roland Garros",
    "Australian Open",
    "ATP Masters 1000 Rome",
    "ATP 500 Hamburg",
    "WTA 1000 Madrid",
  ];

  const ttTournaments = [
    "ITTF World Tour",
    "WTT Contender",
    "European Championships",
    "Asian Cup",
    "Champions League TT",
  ];

  const tennisPlayers = [
    ["Novak Djokovic", "Carlos Alcaraz"],
    ["Jannik Sinner", "Daniil Medvedev"],
    ["Alexander Zverev", "Holger Rune"],
    ["Stefanos Tsitsipas", "Andrey Rublev"],
    ["Taylor Fritz", "Casper Ruud"],
    ["Iga Swiatek", "Aryna Sabalenka"],
    ["Coco Gauff", "Elena Rybakina"],
    ["Jessica Pegula", "Barbora Krejcikova"],
  ];

  const ttPlayers = [
    ["Ma Long", "Fan Zhendong"],
    ["Timo Boll", "Dimitrij Ovtcharov"],
    ["Wang Chuqin", "Liang Jingkun"],
    ["Mima Ito", "Chen Meng"],
    ["Sun Yingsha", "Wang Manyu"],
    ["Hugo Calderano", "Truls Moregard"],
  ];

  const surfaces: TennisSurface[] = ["hard", "clay", "grass", "indoor"];
  const rounds = ["R32", "R16", "QF", "SF", "F"];

  const players = sport === "tennis" ? tennisPlayers : ttPlayers;
  const tournaments = sport === "tennis" ? tennisTournaments : ttTournaments;

  return players.map(([p1Name, p2Name], i) => {
    const rng = seedRandom(i * 31 + sport.length);
    const p1 = buildMockPlayer(p1Name);
    const p2 = buildMockPlayer(p2Name);
    const tournament = tournaments[i % tournaments.length];
    const surface = sport === "tennis" ? surfaces[i % surfaces.length] : undefined;
    const round = rounds[Math.floor(rng() * rounds.length)];

    // Build some H2H history
    const numH2H = Math.floor(rng() * 6);
    const h2hMatches = Array.from({ length: numH2H }, (_, j) => ({
      winnerId: rng() > 0.5 ? p1.id : p2.id,
      setsPlayed: Math.ceil(2 + rng() * 3),
      date: new Date(Date.now() - (j + 1) * 90 * 86400000).toISOString(),
      surface,
    }));

    return {
      id: `mock-${sport}-${i}`,
      sport,
      tournament,
      round,
      player1: p1,
      player2: p2,
      surface,
      scheduledAt: new Date(
        Date.now() + Math.floor(rng() * 8) * 3600000
      ).toISOString(),
      headToHead: { player1Id: p1.id, player2Id: p2.id, matches: h2hMatches },
    };
  });
}
