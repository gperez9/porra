export type DashboardPredictionSummary = {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
  groupMatchesCompleted: number;
  knockoutMatchesCompleted: number;
  isKnockoutReady: boolean;
  champion: string | null;
  finalists: string[];
  semifinalists: string[];
};

export const requiredGroupPredictionResults = 72;
export const requiredKnockoutPredictionResults = 32;
export const requiredPredictionResults =
  requiredGroupPredictionResults + requiredKnockoutPredictionResults;

export type ChampionStat = {
  teamName: string;
  count: number;
};

export function buildChampionStats(
  predictions: DashboardPredictionSummary[]
): ChampionStat[] {
  const counts = new Map<string, number>();

  for (const prediction of predictions) {
    if (!prediction.champion) {
      continue;
    }

    counts.set(prediction.champion, (counts.get(prediction.champion) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([teamName, count]) => ({ teamName, count }))
    .sort((a, b) => b.count - a.count || a.teamName.localeCompare(b.teamName));
}

export function getPredictionProgressLabel(
  prediction: DashboardPredictionSummary
) {
  if (
    prediction.knockoutMatchesCompleted === requiredKnockoutPredictionResults
  ) {
    return "Torneo completo";
  }

  if (prediction.knockoutMatchesCompleted > 0) {
    return "Eliminatorias en curso";
  }

  if (prediction.groupMatchesCompleted === requiredGroupPredictionResults) {
    return "Grupos completos";
  }

  if (prediction.groupMatchesCompleted > 0) {
    return "Grupos en curso";
  }

  return "Sin empezar";
}

export function getPredictionStatusLabel({
  groupMatchesCompleted,
  knockoutMatchesCompleted
}: {
  groupMatchesCompleted: number;
  knockoutMatchesCompleted: number;
}) {
  return groupMatchesCompleted >= requiredGroupPredictionResults &&
    knockoutMatchesCompleted >= requiredKnockoutPredictionResults
    ? "COMPLETA"
    : "BORRADOR";
}

export function getPredictionStatusLabelFromResultCount(resultCount: number) {
  return resultCount >= requiredPredictionResults ? "COMPLETA" : "BORRADOR";
}
