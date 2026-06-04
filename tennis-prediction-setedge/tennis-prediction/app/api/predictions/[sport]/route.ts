/**
 * /api/predictions/[sport]
 * Returns stored predictions JSON for a given sport.
 * Falls back to generating fresh predictions if file not found.
 */

import { NextRequest, NextResponse } from "next/server";
import { loadPredictions, savePredictions } from "@/lib/storage";
import { fetchTodayFixtures } from "@/lib/fetcher";
import { generateAllPredictions } from "@/lib/prediction-engine";
import type { Sport, PredictionOutput } from "@/lib/types";

export const runtime = "nodejs";

const VALID_SPORTS: Sport[] = ["tennis", "table-tennis"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { sport: string } }
) {
  const sport = params.sport as Sport;

  if (!VALID_SPORTS.includes(sport)) {
    return NextResponse.json({ error: "Invalid sport" }, { status: 400 });
  }

  // Try to load cached predictions
  let output = loadPredictions(sport);

  // If no predictions or stale (older than 12 hours), regenerate
  const isStale =
    !output ||
    Date.now() - new Date(output.generatedAt).getTime() > 12 * 60 * 60 * 1000;

  if (isStale) {
    try {
      const fixtures = await fetchTodayFixtures(sport);
      const predictions = generateAllPredictions(fixtures);
      output = {
        generatedAt: new Date().toISOString(),
        sport,
        predictions,
      } satisfies PredictionOutput;
      savePredictions(output);
    } catch (err) {
      console.error("[predictions] Failed to generate:", err);
      if (!output) {
        return NextResponse.json(
          { error: "No predictions available" },
          { status: 503 }
        );
      }
    }
  }

  return NextResponse.json(output, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
