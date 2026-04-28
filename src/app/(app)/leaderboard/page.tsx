import Link from "next/link";
import { Home, Medal, Trophy } from "lucide-react";
import { requireUser } from "@/auth/guards";
import { findLeaderboard } from "@/data/repositories/scoring.repo";
import type { ScoreCategory } from "@/domain/scoring/scoringRules";
import { LeaderboardBreakdown } from "./leaderboard-breakdown";

const categoryLabels = {
  groupExactScore: "Marcadores exactos",
  groupOutcome: "Signos de grupo",
  qualifiedForR32: "Clasificados R32",
  champion: "Campeon"
} as const;

const categoryOrder = Object.keys(categoryLabels) as ScoreCategory[];

export default async function LeaderboardPage() {
  await requireUser();
  const leaderboard = await findLeaderboard();

  return (
    <main className="app-shell flex max-w-6xl flex-col">
      <header className="page-header">
        <div>
          <Link
            className="text-sm font-semibold text-[var(--accent-strong)]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Leaderboard</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Ranking global por prediccion individual. Si aun no hay resultados
            reales o recalculo, las predicciones aparecen con 0 puntos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className="action-secondary min-h-10 px-3" href="/dashboard">
            <Home aria-hidden="true" size={17} />
            Pantalla principal
          </Link>
          <div className="icon-tile size-11">
            <Trophy aria-hidden="true" size={24} />
          </div>
        </div>
      </header>

      {leaderboard.length === 0 ? (
        <section className="grid flex-1 place-items-center py-12">
          <div className="max-w-md text-center">
            <div className="icon-tile mx-auto mb-4 size-11">
              <Medal aria-hidden="true" size={24} />
            </div>
            <h2 className="text-xl font-bold">Aun no hay predicciones</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Cuando existan predicciones, apareceran aqui ordenadas por puntos.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 py-8">
          {leaderboard.map((entry) => (
            <article className="panel rounded-lg p-4" key={entry.predictionId}>
              <div className="grid gap-4 md:grid-cols-[4rem_1fr_auto] md:items-center">
                <div className="text-3xl font-bold text-[var(--accent-strong)]">
                  #{entry.rank}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{entry.predictionName}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    @{entry.username}
                  </p>
                  <p className="mt-2">
                    <span className="status-pill">{entry.status}</span>
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-2xl font-bold">{entry.totalPoints}</p>
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                    puntos
                  </p>
                </div>
              </div>

              <LeaderboardBreakdown
                categoryLabels={categoryLabels}
                categoryOrder={categoryOrder}
                entry={entry}
              />
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
