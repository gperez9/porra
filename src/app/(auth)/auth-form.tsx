"use client";

import { useActionState } from "react";
import type { AuthActionState } from "./actions";

type AuthFormProps = {
  action: (
    previousState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
  submitLabel: string;
};

const initialState: AuthActionState = {
  error: null
};

export function AuthForm({ action, submitLabel }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errorId = "auth-form-error";

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        Usuario
        <input
          autoComplete="username"
          aria-describedby={state.error ? errorId : undefined}
          aria-invalid={state.error ? "true" : undefined}
          className="field-input"
          maxLength={32}
          minLength={3}
          name="username"
          pattern="[a-zA-Z0-9_]+"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Contraseña
        <input
          autoComplete={
            submitLabel === "Crear cuenta" ? "new-password" : "current-password"
          }
          aria-describedby={state.error ? errorId : undefined}
          aria-invalid={state.error ? "true" : undefined}
          className="field-input"
          maxLength={128}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>

      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          id={errorId}
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="action-primary disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
