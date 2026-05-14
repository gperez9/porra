import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/guards";
import {
  findPredictionGroupEditorData,
  getTournamentEditBlockReason
} from "@/data/repositories/predictions.repo";
import { GroupsDraftRuntime } from "./groups-draft-runtime";
import { GroupPredictionEditor } from "./group-prediction-editor";
import { GroupsScrollRestorer } from "./groups-scroll-restorer";

type PredictionGroupsPageProps = {
  params: Promise<{
    predictionId: string;
  }>;
};

export default async function PredictionGroupsPage({
  params
}: PredictionGroupsPageProps) {
  const user = await requireUser();
  const { predictionId } = await params;
  const data = await findPredictionGroupEditorData(user.id, predictionId);

  if (!data) {
    notFound();
  }

  const completedGroups = data.groups.filter((group) => group.standings).length;
  const blockReason = await getTournamentEditBlockReason(
    user.id,
    data.prediction.tournamentId
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <GroupsDraftRuntime predictionId={predictionId} />
      <GroupsScrollRestorer predictionId={predictionId} />
      <header className="border-b border-[var(--border)] pb-5">
        <Link
          className="text-sm font-semibold text-[var(--accent-strong)]"
          href={`/predictions/${predictionId}`}
        >
          {data.prediction.name}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Fase de grupos</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Grupos completos: {completedGroups}/12. Puedes guardar grupos
          incompletos y volver despues.
        </p>
        {blockReason ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            {blockReason}
          </p>
        ) : null}
      </header>

      {data.qualificationSummary ? (
        <section className="grid gap-5 py-6 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-lg font-bold">Clasificados directos</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {data.qualificationSummary.direct.length} equipos entre primeros y
              segundos de grupo.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-lg font-bold">Mejores terceros</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {data.qualificationSummary.bestThirds
                .map((team) => `${team.teamName} (${team.groupCode})`)
                .join(", ")}
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 py-6">
        {data.groups.map((group) => (
          <GroupPredictionEditor
            group={group}
            key={`${predictionId}:${group.code}`}
            predictionId={predictionId}
            readOnly={Boolean(blockReason)}
          />
        ))}
      </div>

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
