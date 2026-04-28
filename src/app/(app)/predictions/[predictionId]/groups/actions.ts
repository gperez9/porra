"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth/guards";
import { parseOptionalScore } from "@/domain/predictions/validation";
import { saveGroupPredictedResultsForUser } from "@/data/repositories/predictions.repo";
import { recalculateAllPredictionScores } from "@/data/repositories/scoring.repo";

export type GroupPredictionActionState = {
  error: string | null;
  saved: boolean;
};

export async function saveGroupPredictionAction(
  _previousState: GroupPredictionActionState,
  formData: FormData
): Promise<GroupPredictionActionState> {
  const user = await requireUser();
  const predictionId = String(formData.get("predictionId") ?? "");
  const matchIds = formData.getAll("matchId").map(String);

  if (!predictionId || matchIds.length === 0) {
    return { error: "No se pudo guardar este grupo.", saved: false };
  }

  const matchResults = [];

  for (const matchId of matchIds) {
    const homeGoals = parseOptionalScore(formData.get(`homeGoals:${matchId}`));
    const awayGoals = parseOptionalScore(formData.get(`awayGoals:${matchId}`));

    if (!homeGoals.ok) {
      return { error: homeGoals.error, saved: false };
    }

    if (!awayGoals.ok) {
      return { error: awayGoals.error, saved: false };
    }

    const isPartiallyFilled =
      (homeGoals.value === null && awayGoals.value !== null) ||
      (homeGoals.value !== null && awayGoals.value === null);

    if (isPartiallyFilled) {
      return {
        error: "Completa ambos marcadores del partido o deja ambos en blanco.",
        saved: false
      };
    }

    matchResults.push({
      matchId,
      homeGoals: homeGoals.value,
      awayGoals: awayGoals.value
    });
  }

  const result = await saveGroupPredictedResultsForUser(
    user.id,
    predictionId,
    matchResults
  );

  if (!result.ok) {
    return { error: result.error, saved: false };
  }

  await recalculateAllPredictionScores();

  revalidatePath(`/predictions/${predictionId}`);
  revalidatePath(`/predictions/${predictionId}/groups`);
  revalidatePath("/leaderboard");
  return { error: null, saved: true };
}
