"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth/guards";
import { parsePredictionName } from "@/domain/predictions/validation";
import {
  createPredictionForUser,
  deletePredictionForUser,
  duplicatePredictionForUser,
  getCurrentTournamentEditBlockReason,
  getTournamentEditBlockReason,
  findPredictionByUser,
  renamePredictionForUser
} from "@/data/repositories/predictions.repo";

export type PredictionActionState = {
  error: string | null;
};

export async function createPredictionAction(
  _previousState: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const user = await requireUser();
  const parsedName = parsePredictionName(formData.get("name"));

  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message ?? "Nombre invalido." };
  }

  const blockReason = await getCurrentTournamentEditBlockReason(user.id);

  if (blockReason) {
    return { error: blockReason };
  }

  const prediction = await createPredictionForUser(user.id, parsedName.data);
  revalidatePath("/dashboard");
  revalidatePath("/predictions");
  redirect(`/predictions/${prediction.id}`);
}

export async function renamePredictionAction(
  _previousState: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const user = await requireUser();
  const predictionId = String(formData.get("predictionId") ?? "");
  const parsedName = parsePredictionName(formData.get("name"));

  if (!predictionId) {
    return { error: "Prediccion no encontrada." };
  }

  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message ?? "Nombre invalido." };
  }

  const prediction = await findPredictionByUser(user.id, predictionId);

  if (!prediction) {
    return { error: "Prediccion no encontrada." };
  }

  const blockReason = await getTournamentEditBlockReason(
    user.id,
    prediction.tournamentId
  );

  if (blockReason) {
    return { error: blockReason };
  }

  const result = await renamePredictionForUser(
    user.id,
    predictionId,
    parsedName.data
  );

  if (result.count === 0) {
    return { error: "Prediccion no encontrada." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/predictions");
  revalidatePath(`/predictions/${predictionId}`);
  return { error: null };
}

export async function duplicatePredictionAction(formData: FormData) {
  const user = await requireUser();
  const predictionId = String(formData.get("predictionId") ?? "");

  if (!predictionId) {
    redirect("/predictions");
  }

  const prediction = await findPredictionByUser(user.id, predictionId);

  if (prediction) {
    const blockReason = await getTournamentEditBlockReason(
      user.id,
      prediction.tournamentId
    );

    if (blockReason) {
      redirect(`/predictions/${predictionId}`);
    }
  }

  const duplicate = await duplicatePredictionForUser(user.id, predictionId);

  revalidatePath("/dashboard");
  revalidatePath("/predictions");

  if (!duplicate) {
    redirect("/predictions");
  }

  redirect(`/predictions/${duplicate.id}`);
}

export async function deletePredictionAction(formData: FormData) {
  const user = await requireUser();
  const predictionId = String(formData.get("predictionId") ?? "");

  if (predictionId) {
    const prediction = await findPredictionByUser(user.id, predictionId);

    if (prediction) {
      const blockReason = await getTournamentEditBlockReason(
        user.id,
        prediction.tournamentId
      );

      if (blockReason) {
        redirect(`/predictions/${predictionId}`);
      }
    }

    await deletePredictionForUser(user.id, predictionId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/predictions");
  redirect("/predictions");
}
