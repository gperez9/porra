import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-xl place-items-center px-5 py-10">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <div className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-md bg-[var(--surface-strong)] text-[var(--accent-strong)]">
          <SearchX aria-hidden="true" size={24} />
        </div>
        <h1 className="text-2xl font-bold">Pagina no encontrada</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          La ruta no existe o ya no esta disponible.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          href="/dashboard"
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}
