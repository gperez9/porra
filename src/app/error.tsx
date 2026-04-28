"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-xl place-items-center px-5 py-10">
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <div className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-md bg-white text-red-700">
          <AlertTriangle aria-hidden="true" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-red-900">Algo no ha ido bien</h1>
        <p className="mt-2 text-sm leading-6 text-red-700">
          Intenta recargar esta vista. Si se repite, revisa los datos guardados
          o vuelve al dashboard.
        </p>
        <button
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
          onClick={reset}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={18} />
          Reintentar
        </button>
      </section>
    </main>
  );
}
