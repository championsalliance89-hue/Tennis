"use client";

import { useState, useEffect, useCallback } from "react";
import type { Prediction, PredictionOutput, Sport } from "@/lib/types";
import PredictionCard from "./PredictionCard";
import ConfidenceFilters, { type ConfidenceFilter } from "./ConfidenceFilters";
import SportTabs from "./SportTabs";
import StatsBar from "./StatsBar";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";

export default function Dashboard() {
  const [activeSport, setActiveSport]     = useState<Sport>("tennis");
  const [confidenceMin, setConfidenceMin] = useState<ConfidenceFilter>(70);
  const [outputs, setOutputs]             = useState<Partial<Record<Sport, PredictionOutput>>>({});
  const [loading, setLoading]             = useState<Partial<Record<Sport, boolean>>>({});
  const [error, setError]                 = useState<Partial<Record<Sport, string>>>({});

  const fetchPredictions = useCallback(async (sport: Sport) => {
    if (outputs[sport]) return; // already loaded
    setLoading((prev) => ({ ...prev, [sport]: true }));
    setError((prev) => ({ ...prev, [sport]: undefined }));
    try {
      const res = await fetch(`/api/predictions/${sport}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PredictionOutput = await res.json();
      setOutputs((prev) => ({ ...prev, [sport]: data }));
    } catch (err) {
      setError((prev) => ({ ...prev, [sport]: String(err) }));
    } finally {
      setLoading((prev) => ({ ...prev, [sport]: false }));
    }
  }, [outputs]);

  // Load active sport
  useEffect(() => {
    fetchPredictions(activeSport);
  }, [activeSport, fetchPredictions]);

  const currentOutput = outputs[activeSport];
  const isLoading     = loading[activeSport] ?? false;
  const currentError  = error[activeSport];

  // Filter predictions
  const allPredictions: Prediction[] = currentOutput?.predictions ?? [];
  const filtered = allPredictions.filter((p) => p.confidence >= confidenceMin);

  // Count tabs
  const sportCounts: Record<Sport, number> = {
    tennis:        outputs["tennis"]?.predictions.length       ?? 0,
    "table-tennis": outputs["table-tennis"]?.predictions.length ?? 0,
  };

  // Count confidence tiers for active sport
  const confCounts: Record<ConfidenceFilter, number> = {
    90: allPredictions.filter((p) => p.confidence >= 90).length,
    80: allPredictions.filter((p) => p.confidence >= 80).length,
    70: allPredictions.filter((p) => p.confidence >= 70).length,
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-6 py-4"
        style={{
          background: "rgba(8,13,24,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              <span style={{ fontSize: "18px" }}>⚡</span>
            </div>
            <div>
              <h1
                className="font-display tracking-widest leading-none"
                style={{ color: "var(--text-primary)", fontSize: "22px" }}
              >
                SETEDGE
              </h1>
              <p className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                SPORTS ANALYTICS
              </p>
            </div>
          </div>

          {/* Date badge */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
            />
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page title */}
        <div>
          <h2
            className="font-display tracking-wider mb-1"
            style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "var(--text-primary)" }}
          >
            TODAY'S PREDICTIONS
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Over/Under and Set Winner predictions — updated daily at 06:00 UTC
          </p>
        </div>

        {/* Sport tabs */}
        <SportTabs
          active={activeSport}
          onChange={setActiveSport}
          counts={sportCounts}
        />

        {/* Stats bar */}
        {currentOutput && (
          <StatsBar
            predictions={allPredictions}
            generatedAt={currentOutput.generatedAt}
          />
        )}

        {/* Confidence filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
            CONFIDENCE:
          </span>
          <ConfidenceFilters
            active={confidenceMin}
            onChange={setConfidenceMin}
            counts={confCounts}
          />
        </div>

        {/* Market legend */}
        <div className="flex flex-wrap gap-4">
          {[
            { icon: "⟷", label: "Over/Under", desc: "Set count prediction" },
            { icon: "⚑", label: "Set Winner",  desc: "Individual set winner" },
          ].map(({ icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--blue-bright)" }}>{icon}</span>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span style={{ color: "var(--text-muted)" }}>— {desc}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        {isLoading && <LoadingSkeleton />}

        {currentError && !isLoading && (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-sm" style={{ color: "#ef4444" }}>
              Failed to load predictions. Please try again.
            </p>
            <button
              onClick={() => {
                setOutputs((prev) => ({ ...prev, [activeSport]: undefined }));
                fetchPredictions(activeSport);
              }}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-mono transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !currentError && filtered.length === 0 && (
          <EmptyState sport={activeSport} filter={confidenceMin} />
        )}

        {!isLoading && !currentError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((prediction, i) => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Predictions are generated using Elo ratings, recent form (last 5 matches),
            head-to-head history, and surface statistics. For informational purposes only.
            Confidence ≥ 70% displayed. Auto-refreshes daily.
          </p>
        </div>
      </main>
    </div>
  );
}
