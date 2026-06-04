import type {
  Fixture,
  Prediction,
  PredictionMarket,
  ConfidenceTier,
  Sport,
} from "./types";
import { eloWinProbability, eloConfidenceBoost, expectedScore } from "./elo";
import { formScore, formConfidenceBoost, avgSetsFromForm } from "./form";
import { analyseH2H, h2hConfidenceBoost, h2hHighSetProbability } from "./h2h";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 90) return "elite";
  if (confidence >= 80) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Surface Elo Adjustment (Tennis) ─────────────────────────────────────────

function surfaceElo(player: Fixture["player1"], surface: string | undefined): number {
  if (!surface || !player.eloSurface) return player.eloRating;
  const key = surface as keyof typeof player.eloSurface;
  return player.eloSurface[key] ?? player.eloRating;
}

// ─── Over/Under Prediction ────────────────────────────────────────────────────

/**
 * Predict whether a match will go Over/Under a set threshold.
 * Uses: Elo closeness, form, H2H, avg sets stats.
 */
function predictOverUnder(fixture: Fixture): Prediction[] {
  const { player1, player2, headToHead, sport, surface } = fixture;
  const predictions: Prediction[] = [];

  const elo1 = surfaceElo(player1, surface);
  const elo2 = surfaceElo(player2, surface);

  const winProb1 = expectedScore(elo1, elo2); // 0–1
  const matchCompetitiveness = 1 - Math.abs(winProb1 - 0.5) * 2; // 0 = lopsided, 1 = equal

  const form1 = formScore(player1.recentForm);
  const form2 = formScore(player2.recentForm);
  const avgForm = (form1 + form2) / 2;

  const avgSetsP1 = player1.avgSetsPerMatch;
  const avgSetsP2 = player2.avgSetsPerMatch;
  const combinedAvgSets = (avgSetsP1 + avgSetsP2) / 2;

  const h2hAnalysis = analyseH2H(headToHead, player1.id, sport === "table-tennis" ? 4 : 3);
  const h2hHighSet = h2hHighSetProbability(h2hAnalysis);
  const h2hAvgSets = h2hAnalysis.avgSetsPlayed;

  // Weighted avg sets prediction
  const predictedSets =
    combinedAvgSets * 0.4 + h2hAvgSets * 0.35 + matchCompetitiveness * 1.5 * 0.25;

  const thresholds: { label: string; value: number; sport: Sport[] }[] = [
    { label: "2.5", value: 2.5, sport: ["tennis"] },
    { label: "3.5", value: 3.5, sport: ["tennis", "table-tennis"] },
    { label: "4.5", value: 4.5, sport: ["table-tennis"] },
  ];

  for (const threshold of thresholds) {
    if (!threshold.sport.includes(sport)) continue;

    const isOver = predictedSets > threshold.value;
    const direction = isOver ? "Over" : "Under";
    const label = `${direction} ${threshold.label} Sets`;

    // Base confidence from predicted sets vs threshold
    const setDiff = Math.abs(predictedSets - threshold.value);
    let confidence = 60 + setDiff * 12; // 60 base, up to ~84 for 2-set diff

    // Adjust for match competitiveness (over bets benefit from close matches)
    if (isOver) confidence += matchCompetitiveness * 8;
    else confidence += (1 - matchCompetitiveness) * 8;

    // H2H signal
    if (isOver) confidence += h2hHighSet * 8;
    else confidence += (1 - h2hHighSet) * 8;

    // Form adjustment
    confidence += formConfidenceBoost((form1 + form2) / 2);

    confidence = clamp(Math.round(confidence), 50, 97);

    if (confidence < 70) continue; // filter low confidence

    const reasoning = buildReasoning({
      direction,
      threshold: threshold.label,
      predictedSets,
      competitiveness: matchCompetitiveness,
      h2hAvg: h2hAnalysis.avgSetsPlayed,
      combinedAvgSets,
      form1,
      form2,
      player1Name: player1.name,
      player2Name: player2.name,
    });

    predictions.push({
      id: uid(`${sport}-ou`),
      sport,
      fixture: {
        id: fixture.id,
        tournament: fixture.tournament,
        round: fixture.round,
        player1Name: player1.name,
        player2Name: player2.name,
        surface: fixture.surface,
        scheduledAt: fixture.scheduledAt,
      },
      market: "over_under",
      prediction: label,
      confidence,
      tier: confidenceTier(confidence),
      reasoning,
      generatedAt: new Date().toISOString(),
    });
  }

  return predictions;
}

// ─── Set Winner Prediction ────────────────────────────────────────────────────

/**
 * Predict the likely winner of individual sets.
 * Uses Elo, form, and momentum signals.
 */
function predictSetWinner(fixture: Fixture): Prediction[] {
  const { player1, player2, sport, surface } = fixture;
  const predictions: Prediction[] = [];

  const elo1 = surfaceElo(player1, surface);
  const elo2 = surfaceElo(player2, surface);
  const winProb1 = eloWinProbability(elo1, elo2);

  const form1 = formScore(player1.recentForm);
  const form2 = formScore(player2.recentForm);

  const h2h = analyseH2H(fixture.headToHead, player1.id);
  const h2hBoost1 = h2hConfidenceBoost(h2h, true);

  // Sets to predict (1–3 for tennis, 1–2 for table tennis guaranteed)
  const setsToPredict = sport === "tennis" ? [1, 2, 3] : [1, 2, 3];

  for (const setNum of setsToPredict) {
    // Momentum: later sets favour the better player as fatigue sets in
    const momentumFactor = setNum > 1 ? 1.05 : 1.0;

    // Combined score for player 1 vs player 2
    const rawScore1 =
      winProb1 * 0.5 +
      form1 * 0.3 * 100 +
      h2h.player1WinRate * 0.2 * 100;

    const rawScore2 =
      (100 - winProb1) * 0.5 +
      form2 * 0.3 * 100 +
      (1 - h2h.player1WinRate) * 0.2 * 100;

    const total = rawScore1 + rawScore2;
    const p1SetProb = (rawScore1 / total) * momentumFactor;

    const favoured = p1SetProb >= 0.5 ? player1 : player2;
    const favouredProb = p1SetProb >= 0.5 ? p1SetProb : 1 - p1SetProb;

    // Convert probability to confidence
    let confidence = 50 + (favouredProb - 0.5) * 100;
    confidence += eloConfidenceBoost(elo1, elo2) * (p1SetProb >= 0.5 ? 1 : -1);
    confidence += h2hBoost1 * (p1SetProb >= 0.5 ? 1 : -1);
    confidence = clamp(Math.round(confidence), 50, 96);

    if (confidence < 70) continue;

    const setLabel = ["First", "Second", "Third"][setNum - 1];
    const prediction = `${favoured.name} – ${setLabel} Set`;

    predictions.push({
      id: uid(`${sport}-sw`),
      sport,
      fixture: {
        id: fixture.id,
        tournament: fixture.tournament,
        round: fixture.round,
        player1Name: player1.name,
        player2Name: player2.name,
        surface: fixture.surface,
        scheduledAt: fixture.scheduledAt,
      },
      market: "set_winner",
      prediction,
      confidence,
      tier: confidenceTier(confidence),
      reasoning: `${favoured.name} has a ${Math.round(favouredProb * 100)}% probability of taking the ${setLabel.toLowerCase()} set based on Elo, form, and H2H data.`,
      generatedAt: new Date().toISOString(),
    });
  }

  return predictions;
}

// ─── Reasoning Builder ────────────────────────────────────────────────────────

function buildReasoning(params: {
  direction: string;
  threshold: string;
  predictedSets: number;
  competitiveness: number;
  h2hAvg: number;
  combinedAvgSets: number;
  form1: number;
  form2: number;
  player1Name: string;
  player2Name: string;
}): string {
  const parts: string[] = [];

  parts.push(
    `Predicted avg sets: ${params.predictedSets.toFixed(1)} (threshold: ${params.threshold}).`
  );

  if (params.competitiveness > 0.6) {
    parts.push("Match is evenly contested, increasing set count probability.");
  } else {
    parts.push("Elo gap suggests a dominant player, reducing set count.");
  }

  if (params.h2hAvg > 0) {
    parts.push(`H2H avg: ${params.h2hAvg.toFixed(1)} sets/match.`);
  }

  parts.push(
    `${params.player1Name} form: ${Math.round(params.form1 * 100)}%, ${params.player2Name} form: ${Math.round(params.form2 * 100)}%.`
  );

  return parts.join(" ");
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

/**
 * Generate all predictions for a single fixture.
 * Returns only predictions with confidence >= 70.
 */
export function generatePredictions(fixture: Fixture): Prediction[] {
  const overUnder = predictOverUnder(fixture);
  const setWinner = predictSetWinner(fixture);
  return [...overUnder, ...setWinner].filter((p) => p.confidence >= 70);
}

/**
 * Generate predictions for a list of fixtures.
 */
export function generateAllPredictions(fixtures: Fixture[]): Prediction[] {
  return fixtures.flatMap((fixture) => generatePredictions(fixture));
}
