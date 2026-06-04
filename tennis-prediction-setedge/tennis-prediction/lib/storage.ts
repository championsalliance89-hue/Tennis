/**
 * Storage
 * Saves and loads prediction JSON files from /outputs/.
 * On Vercel, /tmp is the only writable directory at runtime.
 * We write to /tmp and serve via API routes.
 */

import fs from "fs";
import path from "path";
import type { PredictionOutput } from "./types";

// In serverless: use /tmp. In dev: use /outputs in project root.
const isServerless =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

function outputDir(): string {
  if (isServerless) return "/tmp/outputs";
  return path.join(process.cwd(), "outputs");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function savePredictions(output: PredictionOutput): void {
  const dir = outputDir();
  ensureDir(dir);
  const filePath = path.join(dir, `${output.sport}.json`);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`[storage] Saved ${output.predictions.length} predictions → ${filePath}`);
}

export function loadPredictions(sport: string): PredictionOutput | null {
  const dir = outputDir();
  const filePath = path.join(dir, `${sport}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as PredictionOutput;
  } catch {
    return null;
  }
}

export function listOutputFiles(): string[] {
  const dir = outputDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
}
