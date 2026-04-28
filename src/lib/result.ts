export type AppResult<T, E = Error> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: E;
    };

export function ok<T>(value: T): AppResult<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): AppResult<never, E> {
  return { ok: false, error };
}
