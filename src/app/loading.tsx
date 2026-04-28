import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl place-items-center px-5 py-10">
      <div
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm font-semibold text-[var(--muted)]"
      >
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin text-[var(--accent-strong)]"
          size={20}
        />
        Cargando...
      </div>
    </main>
  );
}
