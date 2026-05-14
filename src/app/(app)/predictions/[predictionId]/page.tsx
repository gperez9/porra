import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Home, ListChecks, Swords, Trash2 } from "lucide-react";
import { requireUser } from "@/auth/guards";
import {
  findPredictionByUser,
  getTournamentEditBlockReason
} from "@/data/repositories/predictions.repo";
import {
  deletePredictionAction,
  duplicatePredictionAction,
  renamePredictionAction
} from "../actions";
import { PredictionForm } from "../prediction-form";
import { getPredictionStatusLabelFromResultCount } from "@/domain/predictions/dashboardSummary";

type PredictionDetailPageProps = {
  params: Promise<{
    predictionId: string;
  }>;
};

export default async function PredictionDetailPage({
  params
}: PredictionDetailPageProps) {
  const user = await requireUser();
  const { predictionId } = await params;
  const prediction = await findPredictionByUser(user.id, predictionId);

  if (!prediction) {
    notFound();
  }

  const blockReason = await getTournamentEditBlockReason(
    user.id,
    prediction.tournamentId
  );

  return (
    <main className="app-shell flex max-w-4xl flex-col">
      <header className="border-b border-[var(--border)] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="text-sm font-semibold text-[var(--accent-strong)]"
            href="/predictions"
          >
            Mis predicciones
          </Link>
          <Link className="action-secondary min-h-10 px-3" href="/dashboard">
            <Home aria-hidden="true" size={17} />
            Pantalla principal
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{prediction.name}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Estado:{" "}
          <span className="font-semibold">
            {getPredictionStatusLabelFromResultCount(
              prediction._count.predictedResults
            )}
          </span>
          . Resultados guardados: {prediction._count.predictedResults}.
        </p>
        {blockReason ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            {blockReason}
          </p>
        ) : null}
      </header>

      <section className="grid gap-5 py-8 md:grid-cols-2">
        <div className="panel rounded-lg p-5 md:col-span-2">
          <h2 className="text-lg font-bold">Fase de grupos</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Completa los 72 marcadores de grupos y revisa las clasificaciones
            calculadas.
          </p>
          <Link
            className="action-primary mt-5"
            href={`/predictions/${prediction.id}/groups`}
          >
            <ListChecks aria-hidden="true" size={18} />
            {blockReason ? "Ver grupos" : "Rellenar grupos"}
          </Link>
        </div>

        <div className="panel rounded-lg p-5 md:col-span-2">
          <h2 className="text-lg font-bold">Eliminatorias</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Genera la ronda de 32 desde tus grupos y propaga ganadores hasta el
            campeon.
          </p>
          <Link
            className="action-primary mt-5"
            href={`/predictions/${prediction.id}/knockout`}
          >
            <Swords aria-hidden="true" size={18} />
            {blockReason ? "Ver eliminatorias" : "Rellenar eliminatorias"}
          </Link>
        </div>

        <div className="panel rounded-lg p-5">
          <h2 className="text-lg font-bold">Renombrar</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Cambia el nombre con el que identificaras esta porra.
          </p>
          <div className="mt-5">
            <PredictionForm
              action={renamePredictionAction}
              buttonLabel="Guardar nombre"
              defaultName={prediction.name}
              disabled={Boolean(blockReason)}
              hiddenPredictionId={prediction.id}
            />
          </div>
        </div>

        <div className="grid gap-5">
          <div className="panel rounded-lg p-5">
            <h2 className="text-lg font-bold">Duplicar</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Crea una copia en borrador para probar otra variante.
            </p>
            <form action={duplicatePredictionAction} className="mt-5">
              <input name="predictionId" type="hidden" value={prediction.id} />
              <button
                className="action-secondary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(blockReason)}
                type="submit"
              >
                <Copy aria-hidden="true" size={18} />
                Duplicar
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <h2 className="text-lg font-bold text-red-800">Borrar</h2>
            <p className="mt-2 text-sm leading-6 text-red-700">
              Esta accion elimina la prediccion y sus resultados guardados.
            </p>
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-red-800">
                Confirmar borrado
              </summary>
              <form action={deletePredictionAction} className="mt-4">
                <input
                  name="predictionId"
                  type="hidden"
                  value={prediction.id}
                />
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
                  disabled={Boolean(blockReason)}
                  type="submit"
                >
                  <Trash2 aria-hidden="true" size={18} />
                  Borrar prediccion
                </button>
              </form>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
