"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth/guards";
import { saveKnockoutPredictedResultsForUser } from "@/data/repositories/predictions.repo";
import { recalculateAllPredictionScores } from "@/data/repositories/scoring.repo";
import { parseOptionalScore } from "@/domain/predictions/validation";

export type KnockoutPredictionActionState = {
  error: string | null;
  saved: boolean;
};

export async function saveKnockoutPredictionAction(
  _previousState: KnockoutPredictionActionState,
  formData: FormData
): Promise<KnockoutPredictionActionState> {
  const user = await requireUser();
  const predictionId = String(formData.get("predictionId") ?? "");
  const matchIds = formData.getAll("matchId").map(String);

  if (!predictionId || matchIds.length === 0) {
    return { error: "No se pudieron guardar las eliminatorias.", saved: false };
  }

  const matchResults = [];

  for (const matchId of matchIds) {
    const homeGoals = parseOptionalScore(formData.get(`homeGoals:${matchId}`));
    const awayGoals = parseOptionalScore(formData.get(`awayGoals:${matchId}`));
    const qualifiedTeamId =
      String(formData.get(`qualifiedTeamId:${matchId}`) ?? "") || null;

    if (!homeGoals.ok) {
      return { error: homeGoals.error, saved: false };
    }

    if (!awayGoals.ok) {
      return { error: awayGoals.error, saved: false };
    }

    matchResults.push({
      matchId,
      homeGoals: homeGoals.value,
      awayGoals: awayGoals.value,
      qualifiedTeamId
    });
  }

  const result = await saveKnockoutPredictedResultsForUser(
    user.id,
    predictionId,
    matchResults
  );

  if (!result.ok) {
    return { error: result.error, saved: false };
  }

  await recalculateAllPredictionScores();

  revalidatePath(`/predictions/${predictionId}`);
  revalidatePath(`/predictions/${predictionId}/knockout`);
  revalidatePath("/leaderboard");

  return { error: null, saved: true };
}
