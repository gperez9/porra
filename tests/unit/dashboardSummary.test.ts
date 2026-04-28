import { describe, expect, it } from "vitest";
import {
  buildChampionStats,
  getPredictionProgressLabel,
  getPredictionStatusLabel,
  getPredictionStatusLabelFromResultCount,
  type DashboardPredictionSummary
} from "@/domain/predictions/dashboardSummary";

describe("dashboard summary", () => {
  it("orders champion stats by count and team name", () => {
    expect(
      buildChampionStats([
        predictionSummary({ champion: "Argentina" }),
        predictionSummary({ champion: "Espana" }),
        predictionSummary({ champion: "Argentina" }),
        predictionSummary({ champion: "Brasil" }),
        predictionSummary({ champion: null })
      ])
    ).toEqual([
      { teamName: "Argentina", count: 2 },
      { teamName: "Brasil", count: 1 },
      { teamName: "Espana", count: 1 }
    ]);
  });

  it("labels prediction progress from saved results", () => {
    expect(
      getPredictionProgressLabel(
        predictionSummary({
          groupMatchesCompleted: 0,
          knockoutMatchesCompleted: 0
        })
      )
    ).toBe("Sin empezar");
    expect(
      getPredictionProgressLabel(
        predictionSummary({
          groupMatchesCompleted: 42,
          knockoutMatchesCompleted: 0
        })
      )
    ).toBe("Grupos en curso");
    expect(
      getPredictionProgressLabel(
        predictionSummary({
          groupMatchesCompleted: 72,
          knockoutMatchesCompleted: 0
        })
      )
    ).toBe("Grupos completos");
    expect(
      getPredictionProgressLabel(
        predictionSummary({
          groupMatchesCompleted: 72,
          knockoutMatchesCompleted: 7
        })
      )
    ).toBe("Eliminatorias en curso");
    expect(
      getPredictionProgressLabel(
        predictionSummary({
          groupMatchesCompleted: 72,
          knockoutMatchesCompleted: 32
        })
      )
    ).toBe("Torneo completo");
  });

  it("labels prediction status in Spanish from completion", () => {
    expect(
      getPredictionStatusLabel({
        groupMatchesCompleted: 72,
        knockoutMatchesCompleted: 32
      })
    ).toBe("COMPLETA");
    expect(
      getPredictionStatusLabel({
        groupMatchesCompleted: 72,
        knockoutMatchesCompleted: 31
      })
    ).toBe("BORRADOR");
    expect(getPredictionStatusLabelFromResultCount(104)).toBe("COMPLETA");
    expect(getPredictionStatusLabelFromResultCount(103)).toBe("BORRADOR");
  });
});

function predictionSummary(
  overrides: Partial<DashboardPredictionSummary> = {}
): DashboardPredictionSummary {
  return {
    id: "prediction-1",
    name: "Mi porra",
    status: "DRAFT",
    updatedAt: new Date("2026-04-26T00:00:00.000Z"),
    groupMatchesCompleted: 72,
    knockoutMatchesCompleted: 0,
    isKnockoutReady: true,
    champion: "Argentina",
    finalists: [],
    semifinalists: [],
    ...overrides
  };
}
