import { db } from "@/data/db";
import {
  buildChampionStats,
  getPredictionStatusLabel,
  type DashboardPredictionSummary
} from "@/domain/predictions/dashboardSummary";
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
import {
  findTournamentGroupsWithMatches,
  requireCurrentTournament
} from "./tournament.repo";
import thirdPlaceCombinationsSeed from "../../../prisma/seed/fifa-2026/third-place-combinations.json";

const thirdPlaceCombinations =
  thirdPlaceCombinationsSeed as ThirdPlaceCombination[];

export function predictionOwnershipWhere(userId: string, predictionId: string) {
  return {
    id: predictionId,
    userId
  };
}

export async function findPredictionsByUser(userId: string) {
  return db.prediction.findMany({
    where: { userId },
    include: {
      _count: {
        select: { predictedResults: true }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });
}

export async function findUserDashboardData(userId: string) {
  const predictions = await findPredictionsByUser(userId);
  const summaries = await Promise.all(
    predictions.map(async (prediction) => {
      const [groupMatchesCompleted, knockoutData] = await Promise.all([
        db.predictedMatchResult.count({
          where: {
            predictionId: prediction.id,
            match: { stage: "GROUP" },
            homeGoals: { not: null },
            awayGoals: { not: null }
          }
        }),
        findPredictionKnockoutEditorData(userId, prediction.id)
      ]);
      const knockoutMatches = knockoutData?.ready ? knockoutData.matches : [];
      const final = knockoutMatches.find((match) => match.stage === "FINAL");
      const semiFinals = knockoutMatches.filter(
        (match) => match.stage === "SF"
      );
      const summary: DashboardPredictionSummary = {
        id: prediction.id,
        name: prediction.name,
        status: getPredictionStatusLabel({
          groupMatchesCompleted,
          knockoutMatchesCompleted: knockoutMatches.filter(
            (match) => match.qualifiedTeamId
          ).length
        }),
        updatedAt: prediction.updatedAt,
        groupMatchesCompleted,
        knockoutMatchesCompleted: knockoutMatches.filter(
          (match) => match.qualifiedTeamId
        ).length,
        isKnockoutReady: knockoutData?.ready ?? false,
        champion: knockoutData?.champion?.teamName ?? null,
        finalists: [final?.homeTeamName, final?.awayTeamName].filter(
          (teamName) => teamName !== null && teamName !== undefined
        ),
        semifinalists: semiFinals
          .flatMap((match) => [match.homeTeamName, match.awayTeamName])
          .filter((teamName) => teamName !== null && teamName !== undefined)
      };

      return summary;
    })
  );

  return {
    predictions: summaries,
    stats: {
      totalPredictions: summaries.length,
      groupCompletePredictions: summaries.filter(
        (prediction) => prediction.groupMatchesCompleted === 72
      ).length,
      knockoutCompletePredictions: summaries.filter(
        (prediction) => prediction.knockoutMatchesCompleted === 32
      ).length,
      championStats: buildChampionStats(summaries)
    }
  };
}

export async function findPredictionByUser(
  userId: string,
  predictionId: string
) {
  return db.prediction.findFirst({
    where: predictionOwnershipWhere(userId, predictionId),
    include: {
      _count: {
        select: { predictedResults: true }
      }
    }
  });
}

export async function createPredictionForUser(userId: string, name: string) {
  const tournament = await requireCurrentTournament();

  return db.prediction.create({
    data: {
      userId,
      tournamentId: tournament.id,
      name,
      status: "DRAFT"
    }
  });
}

export async function getCurrentTournamentEditBlockReason(userId: string) {
  const tournament = await requireCurrentTournament();
  return getTournamentEditBlockReason(userId, tournament.id);
}

export async function getTournamentEditBlockReason(
  userId: string,
  tournamentId: string
) {
  const [user, control] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    }),
    db.tournamentControl.findUnique({
      where: { tournamentId },
      select: { predictionsLocked: true }
    })
  ]);

  if (user?.role === "ADMIN") {
    return null;
  }

  return control?.predictionsLocked
    ? "Las predicciones estan bloqueadas por administracion."
    : null;
}

export async function renamePredictionForUser(
  userId: string,
  predictionId: string,
  name: string
) {
  return db.prediction.updateMany({
    where: predictionOwnershipWhere(userId, predictionId),
    data: { name }
  });
}

export async function duplicatePredictionForUser(
  userId: string,
  predictionId: string
) {
  const source = await db.prediction.findFirst({
    where: predictionOwnershipWhere(userId, predictionId),
    include: { predictedResults: true }
  });

  if (!source) {
    return null;
  }

  return db.$transaction(async (tx) => {
    const duplicate = await tx.prediction.create({
      data: {
        userId,
        tournamentId: source.tournamentId,
        name: `${source.name} (copia)`,
        status: "DRAFT",
        isPrimary: false
      }
    });

    if (source.predictedResults.length > 0) {
      await tx.predictedMatchResult.createMany({
        data: source.predictedResults.map((result) => ({
          predictionId: duplicate.id,
          matchId: result.matchId,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          homeExtraTimeGoals: result.homeExtraTimeGoals,
          awayExtraTimeGoals: result.awayExtraTimeGoals,
          decidedByPenalties: result.decidedByPenalties,
          penaltyWinnerTeamId: result.penaltyWinnerTeamId,
          qualifiedTeamId: result.qualifiedTeamId
        }))
      });
    }

    return duplicate;
  });
}

export async function deletePredictionForUser(
  userId: string,
  predictionId: string
) {
  return db.prediction.deleteMany({
    where: predictionOwnershipWhere(userId, predictionId)
  });
}

export async function findPredictionGroupEditorData(
  userId: string,
  predictionId: string
) {
  const prediction = await db.prediction.findFirst({
    where: predictionOwnershipWhere(userId, predictionId)
  });

  if (!prediction) {
    return null;
  }

  const [groups, predictedResults] = await Promise.all([
    findTournamentGroupsWithMatches(prediction.tournamentId),
    db.predictedMatchResult.findMany({
      where: { predictionId }
    })
  ]);

  const predictedResultByMatchId = new Map(
    predictedResults.map((result) => [result.matchId, result])
  );

  const groupData = groups.map((group) => {
    const teams = group.slots.map(({ team }) => ({
      id: team.id,
      name: team.name,
      flagCode: team.flagCode,
      fifaCode: team.fifaCode,
      fifaRankingSeed: team.fifaRankingSeed
    }));
    const matches = group.matches.map((match) => {
      const predictedResult = predictedResultByMatchId.get(match.id);

      return {
        id: match.id,
        matchNo: match.matchNo,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeam?.shortName ?? match.homeSource,
        awayTeamName: match.awayTeam?.shortName ?? match.awaySource,
        homeTeamFlagCode: match.homeTeam?.flagCode ?? null,
        awayTeamFlagCode: match.awayTeam?.flagCode ?? null,
        homeGoals: predictedResult?.homeGoals ?? null,
        awayGoals: predictedResult?.awayGoals ?? null
      };
    });
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
    const standings =
      completedMatches.length === 6
        ? calculateGroupStandings(teams, completedMatches)
        : null;

    return {
      code: group.code,
      teams,
      matches,
      standings
    };
  });

  const completeGroups = groupData.filter((group) => group.standings);
  const allGroupsComplete = completeGroups.length === 12;
  const qualificationSummary = allGroupsComplete
    ? buildQualificationSummary(groupData)
    : null;

  return {
    prediction,
    groups: groupData,
    qualificationSummary
  };
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

export async function saveGroupPredictedResultsForUser(
  userId: string,
  predictionId: string,
  matchResults: Array<{
    matchId: string;
    homeGoals: number | null;
    awayGoals: number | null;
  }>
) {
  const prediction = await db.prediction.findFirst({
    where: predictionOwnershipWhere(userId, predictionId)
  });

  if (!prediction) {
    return { ok: false, error: "Prediccion no encontrada." };
  }

  const blockReason = await getTournamentEditBlockReason(
    userId,
    prediction.tournamentId
  );

  if (blockReason) {
    return { ok: false, error: blockReason };
  }

  const matchIds = matchResults.map((result) => result.matchId);
  const matches = await db.match.findMany({
    where: {
      id: { in: matchIds },
      tournamentId: prediction.tournamentId,
      stage: "GROUP"
    },
    select: { id: true }
  });
  const validMatchIds = new Set(matches.map((match) => match.id));

  await db.$transaction(
    matchResults
      .filter((result) => validMatchIds.has(result.matchId))
      .map((result) => {
        if (result.homeGoals === null && result.awayGoals === null) {
          return db.predictedMatchResult.deleteMany({
            where: {
              predictionId,
              matchId: result.matchId
            }
          });
        }

        return db.predictedMatchResult.upsert({
          where: {
            predictionId_matchId: {
              predictionId,
              matchId: result.matchId
            }
          },
          create: {
            predictionId,
            matchId: result.matchId,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals
          },
          update: {
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals
          }
        });
      })
  );

  await db.prediction.update({
    where: { id: predictionId },
    data: { updatedAt: new Date() }
  });

  return { ok: true, error: null };
}

export async function findPredictionKnockoutEditorData(
  userId: string,
  predictionId: string
) {
  const groupEditorData = await findPredictionGroupEditorData(
    userId,
    predictionId
  );

  if (!groupEditorData) {
    return null;
  }

  if (!groupEditorData.qualificationSummary) {
    return {
      prediction: groupEditorData.prediction,
      ready: false,
      reason: "Completa primero los 12 grupos para generar la ronda de 32.",
      matches: [],
      champion: null
    };
  }

  const [knockoutMatches, predictedResults, teams] = await Promise.all([
    db.match.findMany({
      where: {
        tournamentId: groupEditorData.prediction.tournamentId,
        stage: { not: "GROUP" }
      },
      orderBy: { order: "asc" }
    }),
    db.predictedMatchResult.findMany({
      where: {
        predictionId,
        match: {
          stage: { not: "GROUP" }
        }
      },
      include: { match: true }
    }),
    db.team.findMany({
      where: { tournamentId: groupEditorData.prediction.tournamentId }
    })
  ]);

  const template: KnockoutTemplateMatch[] = knockoutMatches.map((match) => ({
    matchNo: match.matchNo,
    stage: match.stage as KnockoutTemplateMatch["stage"],
    homeSource: match.homeSource,
    awaySource: match.awaySource,
    order: match.order
  }));
  const qualifiedTeams = buildQualifiedTeams(
    groupEditorData.qualificationSummary
  );
  const roundOf32Matches = buildRoundOf32Matches(
    qualifiedTeams,
    template,
    thirdPlaceCombinations
  );

  assertRoundOf32Complete(roundOf32Matches);

  const resolvedMatches = resolveKnockoutBracket(
    template,
    roundOf32Matches,
    predictedResults.map((result) => ({
      matchNo: result.match.matchNo,
      qualifiedTeamId: result.qualifiedTeamId
    }))
  );
  const matchRowByMatchNo = new Map(
    knockoutMatches.map((match) => [match.matchNo, match])
  );
  const resultByMatchId = new Map(
    predictedResults.map((result) => [result.matchId, result])
  );
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const matches = resolvedMatches.map((match) => {
    const matchRow = matchRowByMatchNo.get(match.matchNo);
    const predictedResult = matchRow
      ? resultByMatchId.get(matchRow.id)
      : undefined;
    const hasUsableResult =
      predictedResult?.qualifiedTeamId &&
      (predictedResult.qualifiedTeamId === match.homeTeamId ||
        predictedResult.qualifiedTeamId === match.awayTeamId);

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
      homeGoals: hasUsableResult ? (predictedResult.homeGoals ?? null) : null,
      awayGoals: hasUsableResult ? (predictedResult.awayGoals ?? null) : null,
      decidedByPenalties: hasUsableResult
        ? predictedResult.decidedByPenalties
        : false,
      qualifiedTeamId: hasUsableResult ? predictedResult.qualifiedTeamId : null,
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
    prediction: groupEditorData.prediction,
    ready: true,
    reason: null,
    matches,
    champion
  };
}

export async function saveKnockoutPredictedResultsForUser(
  userId: string,
  predictionId: string,
  matchResults: Array<{
    matchId: string;
    homeGoals: number | null;
    awayGoals: number | null;
    qualifiedTeamId: string | null;
  }>
) {
  const data = await findPredictionKnockoutEditorData(userId, predictionId);

  if (!data) {
    return { ok: false, error: "Prediccion no encontrada." };
  }

  const blockReason = await getTournamentEditBlockReason(
    userId,
    data.prediction.tournamentId
  );

  if (blockReason) {
    return { ok: false, error: blockReason };
  }

  if (!data.ready) {
    return { ok: false, error: data.reason };
  }

  const submittedResultByMatchId = new Map(
    matchResults.map((result) => [result.matchId, result])
  );
  const resolvedByMatchNo = new Map<
    string,
    {
      homeTeamId: string | null;
      awayTeamId: string | null;
      qualifiedTeamId: string | null;
    }
  >();
  const operations = [];

  for (const match of data.matches) {
    const result = submittedResultByMatchId.get(match.id);

    if (!result) {
      continue;
    }

    const resolvedTeams =
      match.stage === "R32"
        ? {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId
          }
        : {
            homeTeamId: resolveSubmittedKnockoutSource(
              match.homeSource,
              resolvedByMatchNo
            ),
            awayTeamId: resolveSubmittedKnockoutSource(
              match.awaySource,
              resolvedByMatchNo
            )
          };

    const validation = validateKnockoutPrediction({
      homeTeamId: resolvedTeams.homeTeamId,
      awayTeamId: resolvedTeams.awayTeamId,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      qualifiedTeamId: result.qualifiedTeamId
    });

    if (!validation.ok) {
      return {
        ok: false,
        error: `${match.matchNo}: ${validation.error}`
      };
    }

    resolvedByMatchNo.set(match.matchNo, {
      ...resolvedTeams,
      qualifiedTeamId: validation.value.qualifiedTeamId
    });

    if (validation.value.qualifiedTeamId === null) {
      operations.push(
        db.predictedMatchResult.deleteMany({
          where: {
            predictionId,
            matchId: result.matchId
          }
        })
      );
      continue;
    }

    operations.push(
      db.predictedMatchResult.upsert({
        where: {
          predictionId_matchId: {
            predictionId,
            matchId: result.matchId
          }
        },
        create: {
          predictionId,
          matchId: result.matchId,
          ...validation.value
        },
        update: validation.value
      })
    );
  }

  await db.$transaction(operations);

  await db.prediction.update({
    where: { id: predictionId },
    data: { updatedAt: new Date() }
  });
  await deleteStaleKnockoutResults(userId, predictionId);

  return { ok: true, error: null };
}

function resolveSubmittedKnockoutSource(
  source: string,
  resolvedByMatchNo: Map<
    string,
    {
      homeTeamId: string | null;
      awayTeamId: string | null;
      qualifiedTeamId: string | null;
    }
  >
) {
  const sourceType = source.at(0);
  const sourceMatch = resolvedByMatchNo.get(`M${source.slice(1)}`);

  if (!sourceMatch?.homeTeamId || !sourceMatch.awayTeamId) {
    return null;
  }

  if (sourceType === "W") {
    return sourceMatch.qualifiedTeamId;
  }

  if (sourceType === "L") {
    if (!sourceMatch.qualifiedTeamId) {
      return null;
    }

    return sourceMatch.qualifiedTeamId === sourceMatch.homeTeamId
      ? sourceMatch.awayTeamId
      : sourceMatch.homeTeamId;
  }

  return null;
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

function buildQualifiedTeams(
  qualificationSummary: NonNullable<
    Awaited<ReturnType<typeof findPredictionGroupEditorData>>
  >["qualificationSummary"]
): QualifiedGroupTeam[] {
  if (!qualificationSummary) {
    return [];
  }

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

async function deleteStaleKnockoutResults(
  userId: string,
  predictionId: string
) {
  const data = await findPredictionKnockoutEditorData(userId, predictionId);

  if (!data?.ready) {
    return;
  }

  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const predictedResults = await db.predictedMatchResult.findMany({
    where: {
      predictionId,
      match: { stage: { not: "GROUP" } }
    }
  });
  const staleResultIds = predictedResults.flatMap((result) => {
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
    await db.predictedMatchResult.deleteMany({
      where: { id: { in: staleResultIds } }
    });
  }
}
