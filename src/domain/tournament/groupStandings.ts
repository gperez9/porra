import type { GroupMatchResult, TeamSeed } from "./types";
import {
  createTieBreakMeta,
  type TieBreakMeta,
  type TieBreakReason
} from "./tieBreakers";

export type GroupStanding = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  tieBreakMeta: TieBreakMeta;
};

export function createEmptyStanding(teamId: string): GroupStanding {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    position: 0,
    tieBreakMeta: createTieBreakMeta()
  };
}

export function calculateGroupStandings(
  teams: TeamSeed[],
  matches: GroupMatchResult[]
): GroupStanding[] {
  const standingsByTeam = new Map(
    teams.map((team) => [team.id, createEmptyStanding(team.id)])
  );
  const teamById = new Map(teams.map((team) => [team.id, team]));

  for (const match of matches) {
    const home = requireStanding(standingsByTeam, match.homeTeamId);
    const away = requireStanding(standingsByTeam, match.awayTeamId);

    applyMatch(home, match.homeGoals, match.awayGoals);
    applyMatch(away, match.awayGoals, match.homeGoals);
  }

  const ranked = rankByPoints([...standingsByTeam.values()], matches, teamById);

  return ranked.map((standing, index) => ({
    ...standing,
    position: index + 1
  }));
}

function applyMatch(
  standing: GroupStanding,
  goalsFor: number,
  goalsAgainst: number
) {
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    standing.wins += 1;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.losses += 1;
  }
}

function rankByPoints(
  standings: GroupStanding[],
  matches: GroupMatchResult[],
  teamById: Map<string, TeamSeed>
) {
  return groupByMetric(standings, (standing) => standing.points)
    .sort((a, b) => b.value - a.value)
    .flatMap((group) => {
      if (group.items.length === 1) {
        return group.items.map((standing) => setReasons(standing, ["POINTS"]));
      }

      return rankHeadToHead(group.items, matches, teamById);
    });
}

function rankHeadToHead(
  standings: GroupStanding[],
  matches: GroupMatchResult[],
  teamById: Map<string, TeamSeed>
): GroupStanding[] {
  const criteria: Array<{
    reason: TieBreakReason;
    getValue: (standing: GroupStanding) => number;
  }> = [
    {
      reason: "HEAD_TO_HEAD_POINTS",
      getValue: (standing) =>
        headToHeadStats(standing.teamId, standings, matches).points
    },
    {
      reason: "HEAD_TO_HEAD_GOAL_DIFFERENCE",
      getValue: (standing) =>
        headToHeadStats(standing.teamId, standings, matches).goalDifference
    },
    {
      reason: "HEAD_TO_HEAD_GOALS_FOR",
      getValue: (standing) =>
        headToHeadStats(standing.teamId, standings, matches).goalsFor
    }
  ];

  for (const criterion of criteria) {
    const groups = groupByMetric(standings, criterion.getValue).sort(
      (a, b) => b.value - a.value
    );

    if (groups.length > 1) {
      return groups.flatMap((group) =>
        group.items.length === 1
          ? group.items.map((standing) => addReason(standing, criterion.reason))
          : rankHeadToHead(
              group.items.map((standing) =>
                addReason(standing, criterion.reason)
              ),
              matches,
              teamById
            )
      );
    }
  }

  return rankOverall(standings, teamById);
}

function rankOverall(
  standings: GroupStanding[],
  teamById: Map<string, TeamSeed>
): GroupStanding[] {
  const criteria: Array<{
    reason: TieBreakReason;
    descending: boolean;
    getValue: (standing: GroupStanding) => number;
  }> = [
    {
      reason: "GOAL_DIFFERENCE",
      descending: true,
      getValue: (standing) => standing.goalDifference
    },
    {
      reason: "GOALS_FOR",
      descending: true,
      getValue: (standing) => standing.goalsFor
    },
    {
      reason: "FAIR_PLAY",
      descending: false,
      getValue: (standing) => teamById.get(standing.teamId)?.fairPlayPoints ?? 0
    },
    {
      reason: "FIFA_RANKING_SEED",
      descending: false,
      getValue: (standing) =>
        teamById.get(standing.teamId)?.fifaRankingSeed ??
        Number.MAX_SAFE_INTEGER
    }
  ];

  return rankByCriteria(standings, criteria);
}

function rankByCriteria(
  standings: GroupStanding[],
  criteria: Array<{
    reason: TieBreakReason;
    descending: boolean;
    getValue: (standing: GroupStanding) => number;
  }>
): GroupStanding[] {
  const [criterion, ...nextCriteria] = criteria;

  if (!criterion) {
    return standings;
  }

  const groups = groupByMetric(standings, criterion.getValue).sort((a, b) =>
    criterion.descending ? b.value - a.value : a.value - b.value
  );

  if (groups.length === 1) {
    return rankByCriteria(
      standings.map((standing) => addReason(standing, criterion.reason)),
      nextCriteria
    );
  }

  return groups.flatMap((group) =>
    group.items.length === 1
      ? group.items.map((standing) => addReason(standing, criterion.reason))
      : rankByCriteria(
          group.items.map((standing) => addReason(standing, criterion.reason)),
          nextCriteria
        )
  );
}

function headToHeadStats(
  teamId: string,
  tiedStandings: GroupStanding[],
  matches: GroupMatchResult[]
) {
  const tiedTeamIds = new Set(tiedStandings.map((standing) => standing.teamId));
  const stats = {
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0
  };

  for (const match of matches) {
    const isHomeTeam = match.homeTeamId === teamId;
    const isAwayTeam = match.awayTeamId === teamId;

    if (
      (!isHomeTeam && !isAwayTeam) ||
      !tiedTeamIds.has(match.homeTeamId) ||
      !tiedTeamIds.has(match.awayTeamId)
    ) {
      continue;
    }

    const goalsFor = isHomeTeam ? match.homeGoals : match.awayGoals;
    const goalsAgainst = isHomeTeam ? match.awayGoals : match.homeGoals;

    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      stats.points += 3;
    } else if (goalsFor === goalsAgainst) {
      stats.points += 1;
    }
  }

  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

  return stats;
}

function groupByMetric(
  standings: GroupStanding[],
  getValue: (standing: GroupStanding) => number
) {
  const groups = new Map<number, GroupStanding[]>();

  for (const standing of standings) {
    const value = getValue(standing);
    groups.set(value, [...(groups.get(value) ?? []), standing]);
  }

  return [...groups.entries()].map(([value, items]) => ({ value, items }));
}

function requireStanding(
  standingsByTeam: Map<string, GroupStanding>,
  teamId: string
) {
  const standing = standingsByTeam.get(teamId);

  if (!standing) {
    throw new Error(`Unknown team in group match: ${teamId}`);
  }

  return standing;
}

function addReason(standing: GroupStanding, reason: TieBreakReason) {
  return setReasons(standing, [...standing.tieBreakMeta.reasons, reason]);
}

function setReasons(standing: GroupStanding, reasons: TieBreakReason[]) {
  return {
    ...standing,
    tieBreakMeta: createTieBreakMeta([...new Set(reasons)])
  };
}
