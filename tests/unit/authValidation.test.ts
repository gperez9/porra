import { describe, expect, it } from "vitest";
import {
  isValidPassword,
  isValidUsername,
  parseCredentials
} from "@/auth/validation";

describe("auth validation", () => {
  it("accepts normalized username and password credentials", () => {
    const result = parseCredentials({
      username: " Guillermo_26 ",
      password: "supersecret"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.username).toBe("guillermo_26");
    }
  });

  it("rejects invalid usernames", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("nombre-raro")).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
  });
});
