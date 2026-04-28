import { describe, expect, it } from "vitest";
import groupMatches from "../../prisma/seed/fifa-2026/group-matches.json";
import groups from "../../prisma/seed/fifa-2026/groups.json";
import teams from "../../prisma/seed/fifa-2026/teams.json";

describe("FIFA 2026 seed data", () => {
  it("contains 48 teams in 12 groups of 4", () => {
    expect(teams).toHaveLength(48);
    expect(groups).toHaveLength(12);
    expect(groups.every((group) => group.slots.length === 4)).toBe(true);

    const teamCodes = new Set(teams.map((team) => team.id));
    const groupedTeamCodes = groups.flatMap((group) => group.slots);

    expect(new Set(groupedTeamCodes).size).toBe(48);
    expect(groupedTeamCodes.every((teamCode) => teamCodes.has(teamCode))).toBe(
      true
    );
  });

  it("contains 72 group-stage matches, 6 per group", () => {
    expect(groupMatches).toHaveLength(72);

    const matchesByGroup = new Map<string, number>();

    for (const match of groupMatches) {
      matchesByGroup.set(
        match.groupCode,
        (matchesByGroup.get(match.groupCode) ?? 0) + 1
      );
    }

    expect([...matchesByGroup.values()].every((count) => count === 6)).toBe(
      true
    );
  });

  it("only schedules teams against opponents from the same seeded group", () => {
    const groupByTeamCode = new Map(
      groups.flatMap((group) =>
        group.slots.map((teamCode) => [teamCode, group.code])
      )
    );

    for (const match of groupMatches) {
      expect(groupByTeamCode.get(match.home)).toBe(match.groupCode);
      expect(groupByTeamCode.get(match.away)).toBe(match.groupCode);
    }
  });
});
