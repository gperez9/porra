import { describe, expect, it } from "vitest";
import { calculateGroupStandings } from "@/domain/tournament/groupStandings";
import type { GroupMatchResult, TeamSeed } from "@/domain/tournament/types";

const teams: TeamSeed[] = [
  { id: "A", name: "Team A", fifaCode: "AAA", fifaRankingSeed: 10 },
  { id: "B", name: "Team B", fifaCode: "BBB", fifaRankingSeed: 20 },
  { id: "C", name: "Team C", fifaCode: "CCC", fifaRankingSeed: 30 },
  { id: "D", name: "Team D", fifaCode: "DDD", fifaRankingSeed: 40 }
];

function match(
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number
): GroupMatchResult {
  return { homeTeamId, awayTeamId, homeGoals, awayGoals };
}

describe("calculateGroupStandings", () => {
  it("orders a group without ties by points", () => {
    const standings = calculateGroupStandings(teams, [
      match("A", "B", 2, 0),
      match("A", "C", 1, 0),
      match("A", "D", 3, 0),
      match("B", "C", 1, 0),
      match("B", "D", 1, 0),
      match("C", "D", 2, 0)
    ]);

    expect(standings.map((standing) => standing.teamId)).toEqual([
      "A",
      "B",
      "C",
      "D"
    ]);
    expect(standings.map((standing) => standing.points)).toEqual([9, 6, 3, 0]);
  });

  it("uses head-to-head points for a two-team tie", () => {
    const standings = calculateGroupStandings(teams, [
      match("A", "B", 1, 0),
      match("A", "C", 0, 0),
      match("A", "D", 0, 1),
      match("B", "C", 2, 0),
      match("B", "D", 1, 1),
      match("C", "D", 0, 0)
    ]);

    expect(standings.map((standing) => standing.teamId)).toEqual([
      "D",
      "A",
      "B",
      "C"
    ]);
    expect(standings[1]?.tieBreakMeta.reasons).toContain("HEAD_TO_HEAD_POINTS");
  });

  it("uses head-to-head goal difference for a multi-team tie", () => {
    const standings = calculateGroupStandings(teams, [
      match("A", "B", 1, 0),
      match("B", "C", 2, 0),
      match("C", "A", 1, 0),
      match("A", "D", 1, 0),
      match("B", "D", 1, 0),
      match("C", "D", 1, 0)
    ]);

    expect(standings.map((standing) => standing.teamId)).toEqual([
      "B",
      "A",
      "C",
      "D"
    ]);
    expect(standings[0]?.tieBreakMeta.reasons).toContain(
      "HEAD_TO_HEAD_GOAL_DIFFERENCE"
    );
  });

  it("falls back to overall goal difference when head-to-head is level", () => {
    const standings = calculateGroupStandings(teams, [
      match("A", "B", 0, 0),
      match("A", "C", 0, 0),
      match("B", "C", 0, 0),
      match("A", "D", 3, 0),
      match("B", "D", 2, 0),
      match("C", "D", 1, 0)
    ]);

    expect(standings.map((standing) => standing.teamId)).toEqual([
      "A",
      "B",
      "C",
      "D"
    ]);
    expect(standings[0]?.tieBreakMeta.reasons).toContain("GOAL_DIFFERENCE");
  });

  it("uses ranking seed as the final deterministic tie-breaker", () => {
    const standings = calculateGroupStandings(teams, [
      match("A", "B", 0, 0),
      match("A", "C", 0, 0),
      match("A", "D", 0, 0),
      match("B", "C", 0, 0),
      match("B", "D", 0, 0),
      match("C", "D", 0, 0)
    ]);

    expect(standings.map((standing) => standing.teamId)).toEqual([
      "A",
      "B",
      "C",
      "D"
    ]);
    expect(standings[0]?.tieBreakMeta.decidedByRankingSeed).toBe(true);
  });
});
