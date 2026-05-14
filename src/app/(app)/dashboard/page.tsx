import Link from "next/link";
import {
  BarChart3,
  FilePlus2,
  LogOut,
  ShieldCheck,
  Trophy
} from "lucide-react";
import { requireUser } from "@/auth/guards";
import { logoutAction } from "@/app/(auth)/actions";
import {
  findUserDashboardData,
  getCurrentTournamentEditBlockReason
} from "@/data/repositories/predictions.repo";
import { PredictionSummaryList } from "@/features/dashboard/prediction-summary-list";

export default async function DashboardPage() {
  const user = await requireUser();
  const [dashboard, blockReason] = await Promise.all([
    findUserDashboardData(user.id),
    getCurrentTournamentEditBlockReason(user.id)
  ]);

  return (
    <main className="app-shell flex max-w-6xl flex-col">
      <header className="page-header">
        <div>
          <p className="eyebrow">Porra Mundial</p>
          <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
        </div>

        <form action={logoutAction}>
          <button className="action-secondary min-h-10 px-3" type="submit">
            <LogOut aria-hidden="true" size={17} />
            Salir
          </button>
        </form>
      </header>

      <section className="grid content-start gap-5 py-8 md:grid-cols-4">
        <div className="panel rounded-lg p-5 md:col-span-2">
          <div className="icon-tile mb-4 size-10">
            <Trophy aria-hidden="true" size={22} />
          </div>
          <h2 className="text-xl font-bold">Hola, {user.username}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Gestiona tus borradores y prepara varias versiones de tu porra.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {blockReason ? null : (
              <Link
                className="action-primary min-h-10 px-3"
                href="/predictions/new"
              >
                <FilePlus2 aria-hidden="true" size={17} />
                Nueva prediccion
              </Link>
            )}
            <Link
              className="action-secondary min-h-10 px-3"
              href="/predictions"
            >
              Ver predicciones
            </Link>
            <Link
              className="action-secondary min-h-10 px-3"
              href="/leaderboard"
            >
              Leaderboard
            </Link>
            {user.role === "ADMIN" ? (
              <Link
                className="action-secondary min-h-10 px-3"
                href="/admin/results"
              >
                Admin resultados
              </Link>
            ) : null}
          </div>
        </div>

        <div className="panel rounded-lg p-5">
          <div className="icon-tile mb-4 size-10">
            <ShieldCheck aria-hidden="true" size={22} />
          </div>
          <h2 className="text-lg font-bold">Sesion activa</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Rol: <span className="font-semibold">{user.role}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Predicciones:{" "}
            <span className="font-semibold">
              {dashboard.stats.totalPredictions}
            </span>
          </p>
        </div>

        <div className="panel rounded-lg p-5">
          <div className="icon-tile mb-4 size-10">
            <BarChart3 aria-hidden="true" size={22} />
          </div>
          <h2 className="text-lg font-bold">Progreso</h2>
          <dl className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
            <div className="flex justify-between gap-3">
              <dt>Grupos completos</dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {dashboard.stats.groupCompletePredictions}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Torneos completos</dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {dashboard.stats.knockoutCompletePredictions}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-5 pb-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Tus predicciones</h2>
            <Link
              className="text-sm font-semibold text-[var(--accent-strong)]"
              href="/predictions"
            >
              Ver todas
            </Link>
          </div>
          {blockReason ? (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {blockReason}
            </p>
          ) : null}
          <PredictionSummaryList
            editBlockReason={blockReason}
            predictions={dashboard.predictions}
          />
        </div>

        <aside className="panel rounded-lg p-5">
          <h2 className="text-lg font-bold">Campeones previstos</h2>
          {dashboard.stats.championStats.length > 0 ? (
            <ol className="mt-4 grid gap-3">
              {dashboard.stats.championStats.slice(0, 5).map((stat, index) => (
                <li
                  className="flex items-center justify-between gap-3 text-sm"
                  key={stat.teamName}
                >
                  <span className="font-medium">
                    {index + 1}. {stat.teamName}
                  </span>
                  <span className="status-pill">{stat.count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Aun no hay campeones guardados en tus predicciones.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
