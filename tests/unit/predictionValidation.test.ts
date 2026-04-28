import { describe, expect, it } from "vitest";
import {
  isValidPredictionName,
  parseOptionalScore,
  parsePredictionName
} from "@/domain/predictions/validation";

describe("prediction validation", () => {
  it("accepts and trims valid names", () => {
    const result = parsePredictionName(" Mi porra ");

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe("Mi porra");
    }
  });

  it("rejects names that are too short or too long", () => {
    expect(isValidPredictionName("ab")).toBe(false);
    expect(isValidPredictionName("x".repeat(81))).toBe(false);
  });

  it("parses optional non-negative integer scores", () => {
    expect(parseOptionalScore("")).toEqual({ ok: true, value: null });
    expect(parseOptionalScore(null)).toEqual({ ok: true, value: null });
    expect(parseOptionalScore("0")).toEqual({ ok: true, value: 0 });
    expect(parseOptionalScore("4")).toEqual({ ok: true, value: 4 });
  });

  it("rejects invalid score values", () => {
    expect(parseOptionalScore("-1").ok).toBe(false);
    expect(parseOptionalScore("1.5").ok).toBe(false);
    expect(parseOptionalScore("abc").ok).toBe(false);
  });
});
