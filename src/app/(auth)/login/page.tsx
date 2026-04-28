import Link from "next/link";
import { redirectAuthenticatedUser } from "@/auth/guards";
import { AuthForm } from "../auth-form";
import { loginAction } from "../actions";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="app-shell flex max-w-md flex-col justify-center">
      <section className="panel rounded-lg p-6">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Accede con tu usuario para continuar tu porra.
        </p>

        <div className="mt-6">
          <AuthForm action={loginAction} submitLabel="Entrar" />
        </div>

        <p className="mt-5 text-sm text-[var(--muted)]">
          No tienes cuenta?{" "}
          <Link
            className="font-semibold text-[var(--accent-strong)]"
            href="/register"
          >
            Crear cuenta
          </Link>
        </p>
      </section>
    </main>
  );
}
