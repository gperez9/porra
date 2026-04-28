"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth/guards";
import {
  saveActualGroupResultsForAdmin,
  saveActualKnockoutResultsForAdmin,
  setPredictionsLockedForAdmin
} from "@/data/repositories/results.repo";
import { parseOptionalScore } from "@/domain/predictions/validation";

export type AdminResultsActionState = {
  error: string | null;
  saved: boolean;
};

export async function setPredictionsLockedAction(formData: FormData) {
  const admin = await requireAdmin();
  const locked = String(formData.get("locked") ?? "") === "true";

  await setPredictionsLockedForAdmin(admin.id, locked);
  revalidatePath("/admin/results");
  revalidatePath("/dashboard");
}

export async function saveActualGroupResultsAction(
  _previousState: AdminResultsActionState,
  formData: FormData
): Promise<AdminResultsActionState> {
  const admin = await requireAdmin();
  const matchIds = formData.getAll("matchId").map(String);
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

    matchResults.push({
      matchId,
      homeGoals: homeGoals.value,
      awayGoals: awayGoals.value
    });
  }

  const result = await saveActualGroupResultsForAdmin(admin.id, matchResults);

  if (!result.ok) {
    return { error: result.error, saved: false };
  }

  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
  return { error: null, saved: true };
}

export async function saveActualKnockoutResultsAction(
  _previousState: AdminResultsActionState,
  formData: FormData
): Promise<AdminResultsActionState> {
  const admin = await requireAdmin();
  const matchIds = formData.getAll("matchId").map(String);
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

  const result = await saveActualKnockoutResultsForAdmin(
    admin.id,
    matchResults
  );

  if (!result.ok) {
    return { error: result.error, saved: false };
  }

  revalidatePath("/admin/results");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { error: null, saved: true };
}
