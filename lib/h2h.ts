import type { HeadToHead } from "./types";

/**
 * Head-to-Head Engine
 * Extracts signals from historical meetings between two players.
 */

export interface H2HAnalysis {
  totalMatches: number;
  player1Wins: number;
  player2Wins: number;
  player1WinRate: number; // 0–1
  avgSetsPlayed: number;
  highSetRatioMatches: number; // matches with 3+ sets (or 4+ for TT)
  lowSetRatioMatches: number;  // matches with exactly 2 sets (or 3 for TT)
}

/**
 * Analyse head-to-head history between player1 and player2.
 */
export function analyseH2H(
  h2h: HeadToHead,
  player1Id: string,
  highSetThreshold = 3
): H2HAnalysis {
  const matches = h2h.matches;

  if (matches.length === 0) {
    return {
      totalMatches: 0,
      player1Wins: 0,
      player2Wins: 0,
      player1WinRate: 0.5,
      avgSetsPlayed: 3,
      highSetRatioMatches: 0,
      lowSetRatioMatches: 0,
    };
  }

  const player1Wins = matches.filter((m) => m.winnerId === player1Id).length;
  const player2Wins = matches.length - player1Wins;
  const totalSets = matches.reduce((sum, m) => sum + m.setsPlayed, 0);
  const avgSetsPlayed = totalSets / matches.length;

  const highSetRatioMatches = matches.filter(
    (m) => m.setsPlayed >= highSetThreshold
  ).length;
  const lowSetRatioMatches = matches.filter(
    (m) => m.setsPlayed < highSetThreshold
  ).length;

  return {
    totalMatches: matches.length,
    player1Wins,
    player2Wins,
    player1WinRate: player1Wins / matches.length,
    avgSetsPlayed,
    highSetRatioMatches,
    lowSetRatioMatches,
  };
}

/**
 * H2H confidence contribution based on dominance and match count.
 * Returns a value between -10 and +10.
 */
export function h2hConfidenceBoost(
  analysis: H2HAnalysis,
  player1IsHigher: boolean
): number {
  if (analysis.totalMatches === 0) return 0;

  const dominance = player1IsHigher
    ? analysis.player1WinRate
    : 1 - analysis.player1WinRate;

  // Diminishing confidence if too few matches
  const sampleWeight = Math.min(1, analysis.totalMatches / 5);
  const rawBoost = (dominance - 0.5) * 20; // -10 to +10
  return Math.round(rawBoost * sampleWeight);
}

/**
 * Predict likelihood of a high-set match based on H2H.
 * Returns 0–1 probability.
 */
export function h2hHighSetProbability(analysis: H2HAnalysis): number {
  if (analysis.totalMatches === 0) return 0.5;
  return analysis.highSetRatioMatches / analysis.totalMatches;
}
