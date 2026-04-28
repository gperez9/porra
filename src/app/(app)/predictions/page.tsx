import Link from "next/link";
import { FilePlus2, Pencil, Trophy } from "lucide-react";
import { requireUser } from "@/auth/guards";
import { findPredictionsByUser } from "@/data/repositories/predictions.repo";
import { getPredictionStatusLabelFromResultCount } from "@/domain/predictions/dashboardSummary";

export default async function PredictionsPage() {
  const user = await requireUser();
  const predictions = await findPredictionsByUser(user.id);

  return (
    <main className="app-shell flex max-w-5xl flex-col">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold">Mis predicciones</h1>
        </div>

        <Link className="action-primary min-h-10 px-3" href="/predictions/new">
          <FilePlus2 aria-hidden="true" size={18} />
          Nueva
        </Link>
      </header>

      {predictions.length === 0 ? (
        <section className="grid flex-1 place-items-center py-12">
          <div className="max-w-md text-center">
            <div className="icon-tile mx-auto mb-4 size-11">
              <Trophy aria-hidden="true" size={24} />
            </div>
            <h2 className="text-xl font-bold">Aun no tienes predicciones</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Crea tu primera porra y dejala preparada para completar marcadores
              en la siguiente fase.
            </p>
            <Link className="action-primary mt-5" href="/predictions/new">
              Crear prediccion
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 py-8">
          {predictions.map((prediction) => (
            <Link
              className="panel flex items-center justify-between gap-4 rounded-lg p-4 transition hover:-translate-y-0.5"
              href={`/predictions/${prediction.id}`}
              key={prediction.id}
            >
              <div>
                <h2 className="font-semibold">{prediction.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Estado:{" "}
                  {getPredictionStatusLabelFromResultCount(
                    prediction._count.predictedResults
                  )}
                </p>
              </div>
              <Pencil aria-hidden="true" size={18} />
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
