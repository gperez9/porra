import Link from "next/link";
import { Lock, ShieldCheck, Trophy, Unlock } from "lucide-react";
import { requireAdmin } from "@/auth/guards";
import { findAdminResultsData } from "@/data/repositories/results.repo";
import { setPredictionsLockedAction } from "./actions";
import {
  AdminGroupResultsEditor,
  AdminKnockoutResultsEditor
} from "./admin-results-editor";

export default async function AdminResultsPage() {
  const admin = await requireAdmin();
  const data = await findAdminResultsData();
  const predictionsLocked = data.control?.predictionsLocked ?? false;
  const completedGroups = data.groups.filter((group) => group.standings).length;
  const completedKnockoutMatches = data.knockout.matches.filter(
    (match) => match.qualifiedTeamId
  ).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <Link
            className="text-sm font-semibold text-[var(--accent-strong)]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Resultados reales</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Admin: {admin.username}. Grupos completos {completedGroups}/12.
            Eliminatorias reales {completedKnockoutMatches}/32.
          </p>
        </div>
        <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold">
          <ShieldCheck aria-hidden="true" size={17} />
          ADMIN
        </div>
      </header>

      <section className="grid gap-5 py-6 md:grid-cols-[1fr_20rem]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Bloqueo de predicciones</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Estado actual:{" "}
            <span className="font-semibold">
              {predictionsLocked ? "bloqueadas" : "editables"}
            </span>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={setPredictionsLockedAction}>
              <input name="locked" type="hidden" value="true" />
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
                disabled={predictionsLocked}
                type="submit"
              >
                <Lock aria-hidden="true" size={17} />
                Bloquear
              </button>
            </form>
            <form action={setPredictionsLockedAction}>
              <input name="locked" type="hidden" value="false" />
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold hover:bg-[var(--surface-strong)] disabled:opacity-60"
                disabled={!predictionsLocked}
                type="submit"
              >
                <Unlock aria-hidden="true" size={17} />
                Desbloquear
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md bg-[var(--surface-strong)] text-[var(--accent-strong)]">
            <Trophy aria-hidden="true" size={22} />
          </div>
          <h2 className="text-lg font-bold">Campeon real</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {data.knockout.champion?.teamName ?? "Pendiente"}
          </p>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Fase de grupos</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Los resultados pueden quedar incompletos; cada grupo se calcula
            cuando sus seis partidos tienen marcador.
          </p>
        </div>
        <AdminGroupResultsEditor groups={data.groups} />
      </section>

      <section className="border-t border-[var(--border)] py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Eliminatorias</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Se activan cuando los 12 grupos reales estan completos.
          </p>
        </div>

        {data.knockout.ready ? (
          <AdminKnockoutResultsEditor matches={data.knockout.matches} />
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Completa primero los resultados reales de los 12 grupos.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
