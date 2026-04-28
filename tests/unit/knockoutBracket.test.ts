import { describe, expect, it } from "vitest";
import {
  assertRoundOf32Complete,
  buildRoundOf32Matches,
  getThirdPlaceCombinationKey,
  resolveKnockoutBracket,
  resolveThirdPlaceAssignments,
  validateKnockoutPrediction,
  type KnockoutTemplateMatch,
  type QualifiedGroupTeam,
  type ThirdPlaceCombination
} from "@/domain/tournament/knockoutBracket";
import knockoutTemplateSeed from "../../prisma/seed/fifa-2026/knockout-template.json";
import thirdPlaceCombinationsSeed from "../../prisma/seed/fifa-2026/third-place-combinations.json";

const knockoutTemplate =
  knockoutTemplateSeed as unknown as KnockoutTemplateMatch[];
const thirdPlaceCombinations =
  thirdPlaceCombinationsSeed as unknown as ThirdPlaceCombination[];

describe("knockout bracket", () => {
  it("builds a stable key for qualified third-place groups", () => {
    expect(
      getThirdPlaceCombinationKey(["L", "A", "C", "A", "I", "E", "H", "F", "J"])
    ).toBe("ACEFHIJL");
  });

  it("resolves third-place assignments from the seeded combination table", () => {
    expect(
      resolveThirdPlaceAssignments(
        ["A", "B", "C", "D", "E", "F", "G", "H"],
        [
          {
            combination: "ABCDEFGH",
            assignments: { M74: "C", M77: "G", M79: "H", M80: "E" }
          }
        ]
      )
    ).toMatchObject({
      M74: "C",
      M77: "G",
      M79: "H",
      M80: "E"
    });
  });

  it("fails explicitly when the third-place combination is incomplete or missing", () => {
    expect(() =>
      resolveThirdPlaceAssignments(["A", "B", "C"], thirdPlaceCombinations)
    ).toThrow(/Expected exactly 8/);

    expect(() =>
      resolveThirdPlaceAssignments(["A", "B", "C", "D", "E", "F", "G", "H"], [])
    ).toThrow(/Missing third-place combination seed/);
  });

  it("builds all 16 round-of-32 matches with two resolved teams", () => {
    const qualifiedTeams = buildQualifiedTeams([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H"
    ]);

    const matches = buildRoundOf32Matches(
      qualifiedTeams,
      knockoutTemplate,
      thirdPlaceCombinations
    );

    expect(matches).toHaveLength(16);
    expect(matches.map((match) => match.matchNo)).toEqual([
      "M73",
      "M74",
      "M75",
      "M76",
      "M77",
      "M78",
      "M79",
      "M80",
      "M81",
      "M82",
      "M83",
      "M84",
      "M85",
      "M86",
      "M87",
      "M88"
    ]);
    expect(matches.every((match) => match.homeTeamId && match.awayTeamId)).toBe(
      true
    );
    expect(() => assertRoundOf32Complete(matches)).not.toThrow();
  });

  it("fails explicitly when a resolved round-of-32 match is incomplete", () => {
    expect(() =>
      assertRoundOf32Complete([
        {
          matchNo: "M74",
          stage: "R32",
          homeSource: "1E",
          awaySource: "3ABCDF",
          order: 2,
          homeTeamId: "E1",
          awayTeamId: null
        }
      ])
    ).toThrow(/Round of 32 match M74 is incomplete/);
  });

  it("propagates winners and semi-final losers through the knockout template", () => {
    const qualifiedTeams = buildQualifiedTeams([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H"
    ]);
    const roundOf32Matches = buildRoundOf32Matches(
      qualifiedTeams,
      knockoutTemplate,
      thirdPlaceCombinations
    );
    const results = [
      ...roundOf32Matches.map((match) => ({
        matchNo: match.matchNo,
        qualifiedTeamId: match.homeTeamId
      })),
      { matchNo: "M89", qualifiedTeamId: "E1" },
      { matchNo: "M90", qualifiedTeamId: "A2" },
      { matchNo: "M91", qualifiedTeamId: "C1" },
      { matchNo: "M92", qualifiedTeamId: "A1" },
      { matchNo: "M93", qualifiedTeamId: "K2" },
      { matchNo: "M94", qualifiedTeamId: "D1" },
      { matchNo: "M95", qualifiedTeamId: "J1" },
      { matchNo: "M96", qualifiedTeamId: "B1" },
      { matchNo: "M97", qualifiedTeamId: "E1" },
      { matchNo: "M98", qualifiedTeamId: "K2" },
      { matchNo: "M99", qualifiedTeamId: "C1" },
      { matchNo: "M100", qualifiedTeamId: "J1" },
      { matchNo: "M101", qualifiedTeamId: "E1" },
      { matchNo: "M102", qualifiedTeamId: "C1" }
    ];

    const bracket = resolveKnockoutBracket(
      knockoutTemplate,
      roundOf32Matches,
      results
    );
    const final = bracket.find((match) => match.matchNo === "M104");
    const thirdPlace = bracket.find((match) => match.matchNo === "M103");

    expect(final?.homeTeamId).toBe("E1");
    expect(final?.awayTeamId).toBe("C1");
    expect(thirdPlace?.homeTeamId).toBe("K2");
    expect(thirdPlace?.awayTeamId).toBe("J1");
  });

  it("validates knockout winners from score or penalties", () => {
    expect(
      validateKnockoutPrediction({
        homeTeamId: "A",
        awayTeamId: "B",
        homeGoals: 2,
        awayGoals: 1,
        qualifiedTeamId: "A"
      })
    ).toMatchObject({
      ok: true,
      value: {
        decidedByPenalties: false,
        penaltyWinnerTeamId: null,
        qualifiedTeamId: "A"
      }
    });

    expect(
      validateKnockoutPrediction({
        homeTeamId: "A",
        awayTeamId: "B",
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "B"
      })
    ).toMatchObject({
      ok: true,
      value: {
        decidedByPenalties: true,
        penaltyWinnerTeamId: "B",
        qualifiedTeamId: "B"
      }
    });
  });

  it("rejects inconsistent knockout winners", () => {
    expect(
      validateKnockoutPrediction({
        homeTeamId: "A",
        awayTeamId: "B",
        homeGoals: 2,
        awayGoals: 0,
        qualifiedTeamId: "B"
      })
    ).toMatchObject({
      ok: false,
      error: "El clasificado debe coincidir con el ganador del marcador."
    });

    expect(
      validateKnockoutPrediction({
        homeTeamId: "A",
        awayTeamId: "B",
        homeGoals: 0,
        awayGoals: null,
        qualifiedTeamId: "A"
      })
    ).toMatchObject({
      ok: false,
      error: "Completa ambos marcadores del partido o deja ambos en blanco."
    });
  });
});

function buildQualifiedTeams(thirdPlaceGroups: string[]): QualifiedGroupTeam[] {
  const groups = "ABCDEFGHIJKL".split("");
  const directTeams = groups.flatMap((groupCode) => [
    {
      groupCode,
      position: 1 as const,
      teamId: `${groupCode}1`
    },
    {
      groupCode,
      position: 2 as const,
      teamId: `${groupCode}2`
    }
  ]);
  const thirdPlacedTeams = thirdPlaceGroups.map((groupCode) => ({
    groupCode,
    position: 3 as const,
    teamId: `${groupCode}3`
  }));

  return [...directTeams, ...thirdPlacedTeams];
}
