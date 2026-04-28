import { db } from "@/data/db";
import { calculateGroupStandings } from "@/domain/tournament/groupStandings";
import {
  assertRoundOf32Complete,
  buildRoundOf32Matches,
  resolveKnockoutBracket,
  validateKnockoutPrediction,
  type KnockoutTemplateMatch,
  type QualifiedGroupTeam,
  type ThirdPlaceCombination
} from "@/domain/tournament/knockoutBracket";
import { rankThirdPlacedTeams } from "@/domain/tournament/thirdPlacedTeams";
import type { GroupMatchResult } from "@/domain/tournament/types";
import { recalculateAllPredictionScores } from "./scoring.repo";
import { requireCurrentTournament } from "./tournament.repo";
import thirdPlaceCombinationsSeed from "../../../prisma/seed/fifa-2026/third-place-combinations.json";

const thirdPlaceCombinations =
  thirdPlaceCombinationsSeed as ThirdPlaceCombination[];

export type AdminResultInput = {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId?: string | null;
};

export async function findAdminResultsData() {
  const tournament = await requireCurrentTournament();
  const [control, groups, knockoutMatches, actualKnockoutResults, teams] =
    await Promise.all([
      db.tournamentControl.findUnique({
        where: { tournamentId: tournament.id }
      }),
      db.group.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { code: "asc" },
        include: {
          slots: {
            orderBy: { slot: "asc" },
            include: { team: true }
          },
          matches: {
            where: { stage: "GROUP" },
            orderBy: { order: "asc" },
            include: {
              homeTeam: true,
              awayTeam: true,
              actualResult: true
            }
          }
        }
      }),
      db.match.findMany({
        where: { tournamentId: tournament.id, stage: { not: "GROUP" } },
        orderBy: { order: "asc" },
        include: { actualResult: true }
      }),
      db.actualMatchResult.findMany({
        where: {
          match: {
            tournamentId: tournament.id,
            stage: { not: "GROUP" }
          }
        },
        include: { match: true }
      }),
      db.team.findMany({
        where: { tournamentId: tournament.id }
      })
    ]);
  const groupData = buildGroupResults(groups);
  const allGroupsComplete = groupData.every((group) => group.standings);
  const qualificationSummary = allGroupsComplete
    ? buildQualificationSummary(groupData)
    : null;

  return {
    tournament,
    control: control ?? null,
    groups: groupData,
    qualificationSummary,
    knockout: qualificationSummary
      ? buildKnockoutResults(
          knockoutMatches.map((match) => ({
            ...match,
            stage: match.stage as KnockoutTemplateMatch["stage"]
          })),
          actualKnockoutResults,
          teams,
          qualificationSummary
        )
      : {
          ready: false,
          matches: [],
          champion: null
        }
  };
}

export async function setPredictionsLockedForAdmin(
  adminUserId: string,
  locked: boolean
) {
  const tournament = await requireCurrentTournament();

  await db.tournamentControl.upsert({
    where: { tournamentId: tournament.id },
    create: {
      tournamentId: tournament.id,
      predictionsLocked: locked,
      lockedAt: locked ? new Date() : null,
      lockedByUserId: locked ? adminUserId : null
    },
    update: {
      predictionsLocked: locked,
      lockedAt: locked ? new Date() : null,
      lockedByUserId: locked ? adminUserId : null
    }
  });
}

export async function saveActualGroupResultsForAdmin(
  adminUserId: string,
  matchResults: AdminResultInput[]
) {
  const tournament = await requireCurrentTournament();
  const matches = await db.match.findMany({
    where: {
      tournamentId: tournament.id,
      stage: "GROUP",
      id: { in: matchResults.map((result) => result.matchId) }
    },
    select: { id: true }
  });
  const validMatchIds = new Set(matches.map((match) => match.id));
  const operations = [];

  for (const result of matchResults) {
    if (!validMatchIds.has(result.matchId)) {
      continue;
    }

    if (result.homeGoals === null && result.awayGoals === null) {
      operations.push(
        db.actualMatchResult.deleteMany({
          where: { matchId: result.matchId }
        })
      );
      continue;
    }

    if (result.homeGoals === null || result.awayGoals === null) {
      return {
        ok: false,
        error: "Completa ambos marcadores del partido o deja ambos en blanco."
      };
    }

    operations.push(
      db.actualMatchResult.upsert({
        where: { matchId: result.matchId },
        create: {
          matchId: result.matchId,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          decidedByPenalties: false,
          penaltyWinnerTeamId: null,
          qualifiedTeamId: null,
          updatedByUserId: adminUserId
        },
        update: {
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          decidedByPenalties: false,
          penaltyWinnerTeamId: null,
          qualifiedTeamId: null,
          updatedByUserId: adminUserId
        }
      })
    );
  }

  await db.$transaction(operations);
  await deleteStaleActualKnockoutResults();
  await recalculateAllPredictionScores();

  return { ok: true, error: null };
}

export async function saveActualKnockoutResultsForAdmin(
  adminUserId: string,
  matchResults: AdminResultInput[]
) {
  const data = await findAdminResultsData();

  if (!data.knockout.ready) {
    return {
      ok: false,
      error: "Completa primero todos los resultados reales de grupos."
    };
  }

  const matchById = new Map(
    data.knockout.matches.map((match) => [match.id, match])
  );
  const operations = [];

  for (const result of matchResults) {
    const match = matchById.get(result.matchId);

    if (!match) {
      continue;
    }

    const validation = validateKnockoutPrediction({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      qualifiedTeamId: result.qualifiedTeamId ?? null
    });

    if (!validation.ok) {
      return {
        ok: false,
        error: `${match.matchNo}: ${validation.error}`
      };
    }

    if (validation.value.qualifiedTeamId === null) {
      operations.push(
        db.actualMatchResult.deleteMany({
          where: { matchId: result.matchId }
        })
      );
      continue;
    }

    operations.push(
      db.actualMatchResult.upsert({
        where: { matchId: result.matchId },
        create: {
          matchId: result.matchId,
          ...validation.value,
          updatedByUserId: adminUserId
        },
        update: {
          ...validation.value,
          updatedByUserId: adminUserId
        }
      })
    );
  }

  await db.$transaction(operations);
  await deleteStaleActualKnockoutResults();
  await recalculateAllPredictionScores();

  return { ok: true, error: null };
}

function buildGroupResults(
  groups: Array<{
    code: string;
    slots: Array<{
      team: {
        id: string;
        name: string;
        flagCode: string;
        fifaCode: string;
        fifaRankingSeed: number;
      };
    }>;
    matches: Array<{
      id: string;
      matchNo: string;
      homeTeamId: string | null;
      awayTeamId: string | null;
      homeSource: string;
      awaySource: string;
      homeTeam: { shortName: string; flagCode: string } | null;
      awayTeam: { shortName: string; flagCode: string } | null;
      actualResult: {
        homeGoals: number | null;
        awayGoals: number | null;
      } | null;
    }>;
  }>
) {
  return groups.map((group) => {
    const teams = group.slots.map(({ team }) => ({
      id: team.id,
      name: team.name,
      flagCode: team.flagCode,
      fifaCode: team.fifaCode,
      fifaRankingSeed: team.fifaRankingSeed
    }));
    const matches = group.matches.map((match) => ({
      id: match.id,
      matchNo: match.matchNo,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam?.shortName ?? match.homeSource,
      awayTeamName: match.awayTeam?.shortName ?? match.awaySource,
      homeTeamFlagCode: match.homeTeam?.flagCode ?? null,
      awayTeamFlagCode: match.awayTeam?.flagCode ?? null,
      homeGoals: match.actualResult?.homeGoals ?? null,
      awayGoals: match.actualResult?.awayGoals ?? null
    }));
    const completedMatches: GroupMatchResult[] = matches.flatMap((match) =>
      isCompleteGroupMatch(match)
        ? [
            {
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              homeGoals: match.homeGoals,
              awayGoals: match.awayGoals
            }
          ]
        : []
    );

    return {
      code: group.code,
      teams,
      matches,
      standings:
        completedMatches.length === 6
          ? calculateGroupStandings(teams, completedMatches)
          : null
    };
  });
}

function buildKnockoutResults(
  knockoutMatches: Array<{
    id: string;
    matchNo: string;
    stage: KnockoutTemplateMatch["stage"];
    homeSource: string;
    awaySource: string;
    order: number;
    actualResult: {
      homeGoals: number | null;
      awayGoals: number | null;
      decidedByPenalties: boolean;
      qualifiedTeamId: string | null;
    } | null;
  }>,
  actualResults: Array<{
    matchId: string;
    qualifiedTeamId: string | null;
    match: { matchNo: string };
  }>,
  teams: Array<{
    id: string;
    name: string;
    shortName: string;
    flagCode: string;
  }>,
  qualificationSummary: QualificationSummary
) {
  const template = knockoutMatches.map((match) => ({
    matchNo: match.matchNo,
    stage: match.stage,
    homeSource: match.homeSource,
    awaySource: match.awaySource,
    order: match.order
  }));
  const roundOf32Matches = buildRoundOf32Matches(
    buildQualifiedTeams(qualificationSummary),
    template,
    thirdPlaceCombinations
  );

  assertRoundOf32Complete(roundOf32Matches);

  const resolvedMatches = resolveKnockoutBracket(
    template,
    roundOf32Matches,
    actualResults.map((result) => ({
      matchNo: result.match.matchNo,
      qualifiedTeamId: result.qualifiedTeamId
    }))
  );
  const matchRowByMatchNo = new Map(
    knockoutMatches.map((match) => [match.matchNo, match])
  );
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const matches = resolvedMatches.map((match) => {
    const matchRow = matchRowByMatchNo.get(match.matchNo);
    const actualResult = matchRow?.actualResult;
    const hasUsableResult =
      actualResult?.qualifiedTeamId &&
      (actualResult.qualifiedTeamId === match.homeTeamId ||
        actualResult.qualifiedTeamId === match.awayTeamId);

    return {
      id: matchRow?.id ?? match.matchNo,
      matchNo: match.matchNo,
      stage: match.stage,
      homeSource: match.homeSource,
      awaySource: match.awaySource,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeamId
        ? (teamById.get(match.homeTeamId)?.shortName ?? match.homeTeamId)
        : null,
      awayTeamName: match.awayTeamId
        ? (teamById.get(match.awayTeamId)?.shortName ?? match.awayTeamId)
        : null,
      homeTeamFlagCode: match.homeTeamId
        ? (teamById.get(match.homeTeamId)?.flagCode ?? null)
        : null,
      awayTeamFlagCode: match.awayTeamId
        ? (teamById.get(match.awayTeamId)?.flagCode ?? null)
        : null,
      homeGoals: hasUsableResult ? (actualResult.homeGoals ?? null) : null,
      awayGoals: hasUsableResult ? (actualResult.awayGoals ?? null) : null,
      decidedByPenalties: hasUsableResult
        ? actualResult.decidedByPenalties
        : false,
      qualifiedTeamId: hasUsableResult ? actualResult.qualifiedTeamId : null,
      ready: match.homeTeamId !== null && match.awayTeamId !== null
    };
  });
  const finalMatch = matches.find((match) => match.stage === "FINAL");
  const champion = finalMatch?.qualifiedTeamId
    ? {
        teamId: finalMatch.qualifiedTeamId,
        teamName:
          teamById.get(finalMatch.qualifiedTeamId)?.name ??
          finalMatch.qualifiedTeamId,
        flagCode: teamById.get(finalMatch.qualifiedTeamId)?.flagCode ?? null
      }
    : null;

  return {
    ready: true,
    matches,
    champion
  };
}

function buildQualificationSummary(
  groups: Array<{
    code: string;
    teams: Array<{ id: string; name: string; fifaRankingSeed: number }>;
    standings: Awaited<ReturnType<typeof calculateGroupStandings>> | null;
  }>
) {
  const teamNameById = new Map(
    groups.flatMap((group) => group.teams.map((team) => [team.id, team.name]))
  );
  const direct = groups.flatMap((group) =>
    (group.standings ?? [])
      .filter((standing) => standing.position <= 2)
      .map((standing) => ({
        groupCode: group.code,
        teamId: standing.teamId,
        teamName: teamNameById.get(standing.teamId) ?? standing.teamId,
        position: standing.position
      }))
  );
  const thirdPlacedTeams = groups
    .map((group) => {
      const third = group.standings?.find(
        (standing) => standing.position === 3
      );
      const team = group.teams.find(
        (candidate) => candidate.id === third?.teamId
      );

      if (!third || !team) {
        return null;
      }

      return {
        groupCode: group.code,
        teamId: third.teamId,
        points: third.points,
        goalDifference: third.goalDifference,
        goalsFor: third.goalsFor,
        fifaRankingSeed: team.fifaRankingSeed
      };
    })
    .filter((team) => team !== null);
  const bestThirds = rankThirdPlacedTeams(thirdPlacedTeams).slice(0, 8);

  return {
    direct,
    bestThirds: bestThirds.map((team) => ({
      ...team,
      teamName: teamNameById.get(team.teamId) ?? team.teamId
    }))
  };
}

type QualificationSummary = ReturnType<typeof buildQualificationSummary>;

function buildQualifiedTeams(
  qualificationSummary: QualificationSummary
): QualifiedGroupTeam[] {
  return [
    ...qualificationSummary.direct.map((team) => ({
      groupCode: team.groupCode,
      position: team.position as 1 | 2,
      teamId: team.teamId
    })),
    ...qualificationSummary.bestThirds.map((team) => ({
      groupCode: team.groupCode,
      position: 3 as const,
      teamId: team.teamId
    }))
  ];
}

function isCompleteGroupMatch(match: {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
}): match is GroupMatchResult {
  return (
    match.homeTeamId !== null &&
    match.awayTeamId !== null &&
    match.homeGoals !== null &&
    match.awayGoals !== null
  );
}

async function deleteStaleActualKnockoutResults() {
  const data = await findAdminResultsData();

  if (!data.knockout.ready) {
    await db.actualMatchResult.deleteMany({
      where: { match: { stage: { not: "GROUP" } } }
    });
    return;
  }

  const matchById = new Map(
    data.knockout.matches.map((match) => [match.id, match])
  );
  const actualResults = await db.actualMatchResult.findMany({
    where: { match: { stage: { not: "GROUP" } } }
  });
  const staleResultIds = actualResults.flatMap((result) => {
    const match = matchById.get(result.matchId);
    const isUsable =
      match?.homeTeamId &&
      match.awayTeamId &&
      result.qualifiedTeamId &&
      (result.qualifiedTeamId === match.homeTeamId ||
        result.qualifiedTeamId === match.awayTeamId);

    return isUsable ? [] : [result.id];
  });

  if (staleResultIds.length > 0) {
    await db.actualMatchResult.deleteMany({
      where: { id: { in: staleResultIds } }
    });
  }
}
