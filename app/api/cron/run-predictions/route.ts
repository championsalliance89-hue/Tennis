/**
 * /api/cron/run-predictions
 * Called daily at 06:00 UTC by Vercel Cron.
 * Secured by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchTodayFixtures } from "@/lib/fetcher";
import { generateAllPredictions } from "@/lib/prediction-engine";
import { savePredictions } from "@/lib/storage";
import type { Sport, PredictionOutput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    secret !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const sports: Sport[] = ["tennis", "table-tennis"];

  for (const sport of sports) {
    try {
      const fixtures = await fetchTodayFixtures(sport);
      const predictions = generateAllPredictions(fixtures);

      const output: PredictionOutput = {
        generatedAt: new Date().toISOString(),
        sport,
        predictions,
      };

      savePredictions(output);

      results[sport] = {
        fixtures: fixtures.length,
        predictions: predictions.length,
        elite: predictions.filter((p) => p.tier === "elite").length,
        high: predictions.filter((p) => p.tier === "high").length,
        medium: predictions.filter((p) => p.tier === "medium").length,
      };
    } catch (err) {
      results[sport] = { error: String(err) };
    }
  }

  return NextResponse.json({
    success: true,
    runAt: new Date().toISOString(),
    results,
  });
}
