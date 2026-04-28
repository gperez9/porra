import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("MVP polish", () => {
  it("keeps CI and production migration scripts available", () => {
    expect(packageJson.scripts.ci).toContain("eslint .");
    expect(packageJson.scripts.ci).toContain("vitest run");
    expect(packageJson.scripts.ci).toContain("next build");
    expect(packageJson.scripts["prisma:deploy"]).toBe("prisma migrate deploy");
  });

  it("documents required deployment environment variables", () => {
    const readme = readFileSync("README.md", "utf8");

    expect(readme).toContain("DATABASE_URL");
    expect(readme).toContain("ADMIN_USERNAME");
    expect(readme).toContain("ADMIN_PASSWORD");
    expect(readme).toContain("npm run prisma:deploy");
  });
});
