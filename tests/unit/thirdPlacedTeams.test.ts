import { describe, expect, it } from "vitest";
import {
  rankThirdPlacedTeams,
  selectBestThirdPlacedTeams
} from "@/domain/tournament/thirdPlacedTeams";

describe("third placed teams", () => {
  it("ranks third placed teams by official group-stage criteria", () => {
    const ranked = rankThirdPlacedTeams([
      {
        groupCode: "A",
        teamId: "A3",
        points: 4,
        goalDifference: 0,
        goalsFor: 2,
        fifaRankingSeed: 20
      },
      {
        groupCode: "B",
        teamId: "B3",
        points: 4,
        goalDifference: 1,
        goalsFor: 1,
        fifaRankingSeed: 30
      },
      {
        groupCode: "C",
        teamId: "C3",
        points: 4,
        goalDifference: 1,
        goalsFor: 1,
        fifaRankingSeed: 10
      }
    ]);

    expect(ranked.map((team) => team.teamId)).toEqual(["C3", "B3", "A3"]);
  });

  it("selects 8 qualified and 4 eliminated third placed teams", () => {
    const result = selectBestThirdPlacedTeams(
      Array.from({ length: 12 }, (_, index) => ({
        groupCode: String.fromCharCode(65 + index),
        teamId: `T${index + 1}`,
        points: 12 - index,
        goalDifference: 0,
        goalsFor: 0,
        fifaRankingSeed: index + 1
      }))
    );

    expect(result.qualified).toHaveLength(8);
    expect(result.eliminated).toHaveLength(4);
    expect(result.qualified.at(-1)?.teamId).toBe("T8");
  });
});
