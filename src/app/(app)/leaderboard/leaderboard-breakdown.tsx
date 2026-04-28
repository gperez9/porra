import { ChevronDown } from "lucide-react";
import type { ScoreCategory } from "@/domain/scoring/scoringRules";
import type { LeaderboardEntry } from "@/data/repositories/scoring.repo";

type LeaderboardBreakdownProps = {
  entry: LeaderboardEntry;
  categoryLabels: Record<ScoreCategory, string>;
  categoryOrder: ScoreCategory[];
};

export function LeaderboardBreakdown({
  entry,
  categoryLabels,
  categoryOrder
}: LeaderboardBreakdownProps) {
  return (
    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
      {categoryOrder.map((category) => {
        const item = normalizeBreakdownItem(entry.breakdown, category);
        const details = entry.details[category];

        return (
          <details
            className="rounded-md bg-[var(--surface-strong)] p-3"
            key={category}
          >
            <summary className="cursor-pointer list-none">
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-xs font-semibold uppercase text-[var(--muted)]">
                    {categoryLabels[category]}
                  </span>
                  <span className="mt-1 block font-semibold">
                    {item.points} pts | {item.count}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-strong)]">
                  Ver detalle
                  <ChevronDown aria-hidden="true" size={14} />
                </span>
              </span>
            </summary>

            <div className="mt-3 border-t border-[var(--border)] pt-3">
              {details.length > 0 ? (
                <ul className="grid gap-2">
                  {details.map((detail) => (
                    <li
                      className="rounded-md bg-white/70 p-2"
                      key={`${category}-${detail.label}-${detail.description}`}
                    >
                      <p className="font-semibold">{detail.label}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {detail.description} | +{detail.points} pts
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Sin aciertos en este criterio.
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function normalizeBreakdownItem(
  value: unknown,
  category: ScoreCategory
): { count: number; points: number } {
  if (typeof value !== "object" || value === null || !(category in value)) {
    return { count: 0, points: 0 };
  }

  const item = (value as Record<ScoreCategory, unknown>)[category];

  if (
    typeof item === "object" &&
    item !== null &&
    "count" in item &&
    "points" in item &&
    typeof item.count === "number" &&
    typeof item.points === "number"
  ) {
    return {
      count: item.count,
      points: item.points
    };
  }

  return { count: 0, points: 0 };
}
