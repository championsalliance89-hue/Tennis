"use client";

export type ConfidenceFilter = 90 | 80 | 70;

interface Props {
  active: ConfidenceFilter;
  onChange: (val: ConfidenceFilter) => void;
  counts: Record<ConfidenceFilter, number>;
}

const filters: { value: ConfidenceFilter; label: string }[] = [
  { value: 90, label: "90%+ Elite" },
  { value: 80, label: "80%+ High" },
  { value: 70, label: "70%+ All" },
];

export default function ConfidenceFilters({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-200"
            style={{
              background: isActive ? "rgba(59,130,246,0.15)" : "var(--bg-card)",
              border: isActive ? "1px solid rgba(59,130,246,0.5)" : "1px solid var(--border)",
              color: isActive ? "var(--blue-bright)" : "var(--text-secondary)",
              boxShadow: isActive ? "0 0 12px rgba(59,130,246,0.1)" : "none",
            }}
          >
            {label}
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                background: isActive ? "rgba(59,130,246,0.2)" : "var(--bg-raised)",
                color: isActive ? "var(--blue-bright)" : "var(--text-muted)",
              }}
            >
              {counts[value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
