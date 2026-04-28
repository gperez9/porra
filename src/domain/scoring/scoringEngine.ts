import type { ScoreCategory, ScoringRules } from "./scoringRules";

export type ScorableMatchResult = {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId?: string | null;
};

export type PredictionScoringInput = {
  rules: ScoringRules;
  predictedGroupResults: ScorableMatchResult[];
  actualGroupResults: ScorableMatchResult[];
  predictedQualifiedForR32: string[];
  actualQualifiedForR32: string[];
  predictedChampionId: string | null;
  actualChampionId: string | null;
};

export type ScoreBreakdownItem = {
  count: number;
  points: number;
};

export type ScoreBreakdown = Record<ScoreCategory, ScoreBreakdownItem>;

export type PredictionScoreResult = {
  totalPoints: number;
  breakdown: ScoreBreakdown;
};

export function calculatePredictionScore(
  input: PredictionScoringInput
): PredictionScoreResult {
  const breakdown = createEmptyBreakdown();

  scoreGroupResults(input, breakdown);
  scoreQualifiedForR32(input, breakdown);
  scoreChampion(input, breakdown);

  return {
    totalPoints: Object.values(breakdown).reduce(
      (total, item) => total + item.points,
      0
    ),
    breakdown
  };
}

function scoreGroupResults(
  input: PredictionScoringInput,
  breakdown: ScoreBreakdown
) {
  const predictedByMatchId = new Map(
    input.predictedGroupResults.map((result) => [result.matchId, result])
  );

  for (const actual of input.actualGroupResults) {
    if (!isCompleteScore(actual)) {
      continue;
    }

    const predicted = predictedByMatchId.get(actual.matchId);

    if (!predicted || !isCompleteScore(predicted)) {
      continue;
    }

    if (
      predicted.homeGoals === actual.homeGoals &&
      predicted.awayGoals === actual.awayGoals
    ) {
      addScore(breakdown, "groupExactScore", input.rules.groupExactScore);
      continue;
    }

    if (
      getOutcome(predicted.homeGoals, predicted.awayGoals) ===
      getOutcome(actual.homeGoals, actual.awayGoals)
    ) {
      addScore(breakdown, "groupOutcome", input.rules.groupOutcome);
    }
  }
}

function scoreQualifiedForR32(
  input: PredictionScoringInput,
  breakdown: ScoreBreakdown
) {
  const predictedQualified = new Set(input.predictedQualifiedForR32);

  for (const teamId of new Set(input.actualQualifiedForR32)) {
    if (predictedQualified.has(teamId)) {
      addScore(breakdown, "qualifiedForR32", input.rules.qualifiedForR32);
    }
  }
}

function scoreChampion(
  input: PredictionScoringInput,
  breakdown: ScoreBreakdown
) {
  if (
    input.actualChampionId &&
    input.predictedChampionId &&
    input.actualChampionId === input.predictedChampionId
  ) {
    addScore(breakdown, "champion", input.rules.champion);
  }
}

function createEmptyBreakdown(): ScoreBreakdown {
  return {
    groupExactScore: { count: 0, points: 0 },
    groupOutcome: { count: 0, points: 0 },
    qualifiedForR32: { count: 0, points: 0 },
    champion: { count: 0, points: 0 }
  };
}

function addScore(
  breakdown: ScoreBreakdown,
  category: ScoreCategory,
  points: number
) {
  breakdown[category].count += 1;
  breakdown[category].points += points;
}

function isCompleteScore(
  result: ScorableMatchResult
): result is ScorableMatchResult & { homeGoals: number; awayGoals: number } {
  return result.homeGoals !== null && result.awayGoals !== null;
}

function getOutcome(homeGoals: number, awayGoals: number) {
  if (homeGoals > awayGoals) {
    return "HOME";
  }

  if (homeGoals < awayGoals) {
    return "AWAY";
  }

  return "DRAW";
}
