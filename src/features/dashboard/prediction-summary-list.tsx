import Link from "next/link";
import { CircleDot, Pencil, Trophy } from "lucide-react";
import {
  getPredictionProgressLabel,
  type DashboardPredictionSummary
} from "@/domain/predictions/dashboardSummary";

type PredictionSummaryListProps = {
  editBlockReason?: string | null;
  predictions: DashboardPredictionSummary[];
};

export function PredictionSummaryList({
  editBlockReason = null,
  predictions
}: PredictionSummaryListProps) {
  if (predictions.length === 0) {
    return (
      <section className="panel grid place-items-center rounded-lg px-5 py-12 text-center">
        <div className="max-w-md">
          <div className="icon-tile mx-auto mb-4 size-11">
            <Trophy aria-hidden="true" size={24} />
          </div>
          <h2 className="text-xl font-bold">Aun no tienes predicciones</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Crea tu primera porra y empieza por la fase de grupos.
          </p>
          {editBlockReason ? null : (
            <Link className="action-primary mt-5" href="/predictions/new">
              Crear prediccion
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      {predictions.map((prediction) => (
        <Link
          className="panel grid gap-4 rounded-lg p-4 transition hover:-translate-y-0.5 md:grid-cols-[1fr_auto]"
          href={`/predictions/${prediction.id}`}
          key={prediction.id}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{prediction.name}</h2>
              <span className="status-pill">
                <CircleDot aria-hidden="true" size={13} />
                {getPredictionProgressLabel(prediction)}
              </span>
            </div>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Grupos {prediction.groupMatchesCompleted}/72 | Eliminatorias{" "}
              {prediction.knockoutMatchesCompleted}/32 | Estado{" "}
              {prediction.status}
            </p>

            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <SummaryTerm label="Campeon" value={prediction.champion} />
              <SummaryTerm
                label="Finalistas"
                value={formatTeamList(prediction.finalists)}
              />
              <SummaryTerm
                label="Semifinalistas"
                value={formatTeamList(prediction.semifinalists)}
              />
            </dl>
          </div>

          <div className="flex items-center justify-end gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            Abrir
            <Pencil aria-hidden="true" size={18} />
          </div>
        </Link>
      ))}
    </section>
  );
}

function SummaryTerm({
  label,
  value
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value ?? "Pendiente"}</dd>
    </div>
  );
}

function formatTeamList(teamNames: string[]) {
  return teamNames.length > 0 ? teamNames.join(", ") : null;
}
