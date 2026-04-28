import { z } from "zod";

export const predictionNameSchema = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres.")
  .max(80, "El nombre no puede superar 80 caracteres.");

export function isValidPredictionName(name: string): boolean {
  return predictionNameSchema.safeParse(name).success;
}

export function parsePredictionName(name: FormDataEntryValue | null) {
  return predictionNameSchema.safeParse(name);
}

export type ParsedScoreInput =
  | {
      ok: true;
      value: number | null;
    }
  | {
      ok: false;
      error: string;
    };

export function parseOptionalScore(
  value: FormDataEntryValue | null
): ParsedScoreInput {
  if (value === null || String(value).trim() === "") {
    return { ok: true, value: null };
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return {
      ok: false,
      error: "Los marcadores deben ser enteros no negativos."
    };
  }

  return { ok: true, value: numericValue };
}
