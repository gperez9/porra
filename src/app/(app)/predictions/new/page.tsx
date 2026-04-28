import Link from "next/link";
import { requireUser } from "@/auth/guards";
import { createPredictionAction } from "../actions";
import { PredictionForm } from "../prediction-form";

export default async function NewPredictionPage() {
  await requireUser();

  return (
    <main className="app-shell flex max-w-xl flex-col justify-center">
      <section className="panel rounded-lg p-6">
        <p className="eyebrow">Nueva porra</p>
        <h1 className="mt-1 text-2xl font-bold">Crear prediccion</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Ponle un nombre reconocible. Despues podras rellenar los partidos.
        </p>

        <div className="mt-6">
          <PredictionForm
            action={createPredictionAction}
            buttonLabel="Crear prediccion"
          />
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
