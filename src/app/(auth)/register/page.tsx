import Link from "next/link";
import { redirectAuthenticatedUser } from "@/auth/guards";
import { AuthForm } from "../auth-form";
import { registerAction } from "../actions";

export default async function RegisterPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="app-shell flex max-w-md flex-col justify-center">
      <section className="panel rounded-lg p-6">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Elige un usuario y contraseña. No necesitas email.
        </p>

        <div className="mt-6">
          <AuthForm action={registerAction} submitLabel="Crear cuenta" />
        </div>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Ya tienes cuenta?{" "}
          <Link
            className="font-semibold text-[var(--accent-strong)]"
            href="/login"
          >
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
