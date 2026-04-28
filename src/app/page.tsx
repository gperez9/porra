import Link from "next/link";
import {
  BarChart3,
  ListChecks,
  LockKeyhole,
  LogOut,
  Trophy
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/auth/session";

const phaseItems = [
  {
    label: "Predicciones completas",
    icon: ListChecks
  },
  {
    label: "Resultados reales admin",
    icon: LockKeyhole
  },
  {
    label: "Leaderboard global",
    icon: BarChart3
  },
  {
    label: "Scoring configurable",
    icon: Trophy
  }
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="app-shell flex max-w-6xl flex-col">
      <section className="grid flex-1 content-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/70 px-3 py-1 text-sm font-semibold text-[var(--accent-strong)] shadow-sm">
            <Trophy aria-hidden="true" size={18} />
            Mundial 2026
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-normal text-[var(--foreground)] sm:text-6xl">
            Porra Mundial
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Crea una cuenta sin email, guarda tus predicciones y compite en el
            leaderboard del Mundial 2026.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="action-primary"
              href={user ? "/dashboard" : "/register"}
            >
              {user ? "Ir al dashboard" : "Crear cuenta"}
            </Link>
            {!user ? (
              <Link className="action-secondary" href="/login">
                Entrar
              </Link>
            ) : (
              <form action={logoutAction}>
                <button className="action-secondary" type="submit">
                  <LogOut aria-hidden="true" size={17} />
                  Salir
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="panel grid gap-3 rounded-lg p-4 sm:grid-cols-2 lg:p-5">
          {phaseItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="panel-muted rounded-lg p-4 text-sm font-semibold"
                key={item.label}
              >
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-[var(--surface-strong)] text-[var(--accent-strong)]">
                  <Icon aria-hidden="true" size={18} />
                </div>
                {item.label}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
