import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { requireUser } from "@/auth/guards";
import { TeamLabel } from "@/components/team-label";
import {
  findPredictionKnockoutEditorData,
  getTournamentEditBlockReason
} from "@/data/repositories/predictions.repo";
import { KnockoutPredictionEditor } from "./knockout-prediction-editor";

type PredictionKnockoutPageProps = {
  params: Promise<{
    predictionId: string;
  }>;
};

export default async function PredictionKnockoutPage({
  params
}: PredictionKnockoutPageProps) {
  const user = await requireUser();
  const { predictionId } = await params;
  const data = await findPredictionKnockoutEditorData(user.id, predictionId);

  if (!data) {
    notFound();
  }

  const completedMatches = data.matches.filter(
    (match) => match.qualifiedTeamId
  ).length;
  const blockReason = await getTournamentEditBlockReason(
    user.id,
    data.prediction.tournamentId
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="border-b border-[var(--border)] pb-5">
        <Link
          className="text-sm font-semibold text-[var(--accent-strong)]"
          href={`/predictions/${predictionId}`}
        >
          {data.prediction.name}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Eliminatorias</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Partidos completados: {completedMatches}/32. En empates, el equipo
          clasificado se guarda como ganador por penaltis.
        </p>
        {blockReason ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            {blockReason}
          </p>
        ) : null}
      </header>

      {data.ready ? (
        <>
          {data.champion ? (
            <section className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] py-5">
              <Trophy
                aria-hidden="true"
                className="text-[var(--accent-strong)]"
                size={22}
              />
              <p className="inline-flex flex-wrap items-center gap-2 text-lg font-bold">
                Campeon previsto:
                <TeamLabel
                  flagCode={data.champion.flagCode}
                  name={data.champion.teamName}
                />
              </p>
            </section>
          ) : null}

          <KnockoutPredictionEditor
            matches={data.matches}
            predictionId={predictionId}
          />
        </>
      ) : (
        <section className="py-8">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold">Bracket no disponible</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {data.reason}
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              href={`/predictions/${predictionId}/groups`}
            >
              Completar grupos
            </Link>
          </div>
        </section>
      )}

      <nav className="border-t border-[var(--border)] py-6">
        <Link
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--surface-strong)]"
          href={`/predictions/${predictionId}`}
        >
          Volver
        </Link>
      </nav>
    </main>
  );
}
