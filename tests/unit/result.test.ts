import { describe, expect, it } from "vitest";
import { err, ok } from "@/lib/result";

describe("AppResult helpers", () => {
  it("creates success results", () => {
    expect(ok("ready")).toEqual({ ok: true, value: "ready" });
  });

  it("creates error results", () => {
    expect(err("not-ready")).toEqual({ ok: false, error: "not-ready" });
  });
});
