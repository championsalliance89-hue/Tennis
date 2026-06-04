// ─── Sport Types ─────────────────────────────────────────────────────────────

export type Sport = "tennis" | "table-tennis";

export type TennisSurface = "hard" | "clay" | "grass" | "indoor";

// ─── Player & Match Data ──────────────────────────────────────────────────────

export interface PlayerStats {
  id: string;
  name: string;
  eloRating: number;
  // Elo per surface (tennis only)
  eloSurface?: Record<TennisSurface, number>;
  recentForm: MatchResult[]; // last 5 matches
  setsWon: number;
  setsLost: number;
  totalMatches: number;
  avgSetsPerMatch: number;
}

export interface MatchResult {
  opponentId: string;
  won: boolean;
  setsPlayed: number;
  setsWon: number;
  setsLost: number;
  surface?: TennisSurface;
  date: string;
}

export interface HeadToHead {
  player1Id: string;
  player2Id: string;
  matches: H2HMatch[];
}

export interface H2HMatch {
  winnerId: string;
  setsPlayed: number;
  date: string;
  surface?: TennisSurface;
}

export interface Fixture {
  id: string;
  sport: Sport;
  tournament: string;
  round?: string;
  player1: PlayerStats;
  player2: PlayerStats;
  surface?: TennisSurface;
  scheduledAt: string;
  headToHead: HeadToHead;
}

// ─── Prediction Types ─────────────────────────────────────────────────────────

export type PredictionMarket = "over_under" | "set_winner";

export type ConfidenceTier = "elite" | "high" | "medium" | "low";

export interface Prediction {
  id: string;
  sport: Sport;
  fixture: {
    id: string;
    tournament: string;
    round?: string;
    player1Name: string;
    player2Name: string;
    surface?: TennisSurface;
    scheduledAt: string;
  };
  market: PredictionMarket;
  prediction: string; // e.g. "Over 3.5 Sets" | "Player A to Win Set 1"
  confidence: number; // 0–100
  tier: ConfidenceTier;
  reasoning: string;
  generatedAt: string;
}

export interface PredictionOutput {
  generatedAt: string;
  sport: Sport;
  predictions: Prediction[];
}

// ─── Engine Inputs ────────────────────────────────────────────────────────────

export interface PredictionInput {
  fixture: Fixture;
}
