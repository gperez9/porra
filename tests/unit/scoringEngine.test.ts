import { describe, expect, it } from "vitest";
import { calculatePredictionScore } from "@/domain/scoring/scoringEngine";
import { defaultScoringRules } from "@/domain/scoring/scoringRules";

describe("scoring engine", () => {
  it("scores exact group results, outcomes, R32 qualification and champion", () => {
    const score = calculatePredictionScore({
      rules: defaultScoringRules,
      actualGroupResults: [
        { matchId: "M1", homeGoals: 2, awayGoals: 1 },
        { matchId: "M2", homeGoals: 1, awayGoals: 1 },
        { matchId: "M3", homeGoals: 0, awayGoals: 1 }
      ],
      predictedGroupResults: [
        { matchId: "M1", homeGoals: 2, awayGoals: 1 },
        { matchId: "M2", homeGoals: 2, awayGoals: 2 },
        { matchId: "M3", homeGoals: 1, awayGoals: 0 }
      ],
      actualQualifiedForR32: ["A", "B", "C"],
      predictedQualifiedForR32: ["A", "C", "D"],
      actualChampionId: "A",
      predictedChampionId: "A"
    });

    expect(score.breakdown.groupExactScore).toEqual({ count: 1, points: 3 });
    expect(score.breakdown.groupOutcome).toEqual({ count: 1, points: 1 });
    expect(score.breakdown.qualifiedForR32).toEqual({ count: 2, points: 4 });
    expect(score.breakdown.champion).toEqual({ count: 1, points: 20 });
    expect(score.totalPoints).toBe(28);
  });

  it("does not double count exact score as outcome", () => {
    const score = calculatePredictionScore({
      rules: defaultScoringRules,
      actualGroupResults: [{ matchId: "M1", homeGoals: 3, awayGoals: 0 }],
      predictedGroupResults: [{ matchId: "M1", homeGoals: 3, awayGoals: 0 }],
      actualQualifiedForR32: [],
      predictedQualifiedForR32: [],
      actualChampionId: null,
      predictedChampionId: null
    });

    expect(score.breakdown.groupExactScore.count).toBe(1);
    expect(score.breakdown.groupOutcome.count).toBe(0);
    expect(score.totalPoints).toBe(defaultScoringRules.groupExactScore);
  });

  it("returns zero when there are no actual results", () => {
    const score = calculatePredictionScore({
      rules: defaultScoringRules,
      actualGroupResults: [],
      predictedGroupResults: [{ matchId: "M1", homeGoals: 3, awayGoals: 0 }],
      actualQualifiedForR32: [],
      predictedQualifiedForR32: ["A"],
      actualChampionId: null,
      predictedChampionId: "A"
    });

    expect(score.totalPoints).toBe(0);
  });
});
