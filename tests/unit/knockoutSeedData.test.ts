import { describe, expect, it } from "vitest";
import knockoutTemplateSeed from "../../prisma/seed/fifa-2026/knockout-template.json";
import thirdPlaceCombinationsSeed from "../../prisma/seed/fifa-2026/third-place-combinations.json";

const thirdPlaceSlotPools = {
  M74: "ABCDF",
  M77: "CDFGH",
  M79: "CEFHI",
  M80: "EHIJK",
  M81: "BEFIJ",
  M82: "AEHIJ",
  M85: "EFGIJ",
  M87: "DEIJL"
} as const;

describe("FIFA 2026 knockout seed data", () => {
  it("contains the full knockout template from M73 to M104", () => {
    expect(knockoutTemplateSeed).toHaveLength(32);
    expect(knockoutTemplateSeed.map((match) => match.matchNo)).toEqual(
      Array.from({ length: 32 }, (_, index) => `M${index + 73}`)
    );

    expect(
      knockoutTemplateSeed.filter((match) => match.stage === "R32")
    ).toHaveLength(16);
    expect(
      knockoutTemplateSeed.filter((match) => match.stage === "R16")
    ).toHaveLength(8);
    expect(
      knockoutTemplateSeed.filter((match) => match.stage === "QF")
    ).toHaveLength(4);
    expect(
      knockoutTemplateSeed.filter((match) => match.stage === "SF")
    ).toHaveLength(2);
    expect(
      knockoutTemplateSeed.filter((match) => match.stage === "THIRD_PLACE")
    ).toHaveLength(1);
    expect(
      knockoutTemplateSeed.filter((match) => match.stage === "FINAL")
    ).toHaveLength(1);
  });

  it("contains 495 unique third-place combinations", () => {
    expect(thirdPlaceCombinationsSeed).toHaveLength(495);

    const combinationKeys = new Set(
      thirdPlaceCombinationsSeed.map((entry) => entry.combination)
    );

    expect(combinationKeys.size).toBe(495);
  });

  it("assigns each qualified third-place group to one eligible R32 slot", () => {
    for (const entry of thirdPlaceCombinationsSeed) {
      const combinationGroups = entry.combination.split("");
      const assignments = Object.entries(entry.assignments);

      expect(assignments).toHaveLength(8);
      expect(new Set(assignments.map(([, group]) => group))).toEqual(
        new Set(combinationGroups)
      );

      for (const [matchNo, groupCode] of assignments) {
        const pool =
          thirdPlaceSlotPools[matchNo as keyof typeof thirdPlaceSlotPools];

        expect(pool).toBeDefined();
        expect(pool).toContain(groupCode);
      }
    }
  });
});
