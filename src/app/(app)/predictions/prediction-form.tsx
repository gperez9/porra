"use client";

import { useActionState } from "react";
import type { PredictionActionState } from "./actions";

type PredictionFormProps = {
  action: (
    previousState: PredictionActionState,
    formData: FormData
  ) => Promise<PredictionActionState>;
  buttonLabel: string;
  defaultName?: string;
  hiddenPredictionId?: string;
};

const initialState: PredictionActionState = {
  error: null
};

export function PredictionForm({
  action,
  buttonLabel,
  defaultName = "",
  hiddenPredictionId
}: PredictionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errorId = hiddenPredictionId
    ? `prediction-form-error-${hiddenPredictionId}`
    : "prediction-form-error";

  return (
    <form action={formAction} className="grid gap-3">
      {hiddenPredictionId ? (
        <input name="predictionId" type="hidden" value={hiddenPredictionId} />
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        Nombre
        <input
          aria-describedby={state.error ? errorId : undefined}
          aria-invalid={state.error ? "true" : undefined}
          className="field-input"
          defaultValue={defaultName}
          maxLength={80}
          minLength={3}
          name="name"
          required
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
        {isPending ? "Guardando..." : buttonLabel}
      </button>
    </form>
  );
}
