import { describe, expect, it } from "vitest";
import { canAccessAdmin } from "@/auth/guards";

describe("admin guard", () => {
  it("allows only admin users to access admin routes", () => {
    expect(canAccessAdmin("ADMIN")).toBe(true);
    expect(canAccessAdmin("USER")).toBe(false);
  });
});
