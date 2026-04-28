import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  getSessionExpiresAt,
  hashSessionToken
} from "@/auth/session";

describe("session helpers", () => {
  it("creates high-entropy URL-safe tokens", () => {
    const token = createSessionToken();

    expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes session tokens deterministically", () => {
    expect(hashSessionToken("token")).toBe(hashSessionToken("token"));
    expect(hashSessionToken("token")).not.toBe("token");
  });

  it("sets session expiry roughly 30 days ahead", () => {
    const now = new Date("2026-04-26T00:00:00.000Z");

    expect(getSessionExpiresAt(now).toISOString()).toBe(
      "2026-05-26T00:00:00.000Z"
    );
  });
});
