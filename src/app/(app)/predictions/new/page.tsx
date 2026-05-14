import Link from "next/link";
import { requireUser } from "@/auth/guards";
import { getCurrentTournamentEditBlockReason } from "@/data/repositories/predictions.repo";
import { createPredictionAction } from "../actions";
import { PredictionForm } from "../prediction-form";

export default async function NewPredictionPage() {
  const user = await requireUser();
  const blockReason = await getCurrentTournamentEditBlockReason(user.id);

  return (
    <main className="app-shell flex max-w-xl flex-col justify-center">
      <section className="panel rounded-lg p-6">
        <p className="eyebrow">Nueva porra</p>
        <h1 className="mt-1 text-2xl font-bold">Crear prediccion</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Ponle un nombre reconocible. Despues podras rellenar los partidos.
        </p>

        <div className="mt-6">
          {blockReason ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {blockReason}
            </p>
          ) : (
            <PredictionForm
              action={createPredictionAction}
              buttonLabel="Crear prediccion"
            />
          )}
        </div>

        <Link
          className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]"
          href="/predictions"
        >
          Volver a mis predicciones
        </Link>
      </section>
    </main>
  );
}
