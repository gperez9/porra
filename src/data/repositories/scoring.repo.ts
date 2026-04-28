import type { Prisma } from "@prisma/client";
import { db } from "@/data/db";
import { calculateGroupStandings } from "@/domain/tournament/groupStandings";
import type { GroupMatchResult } from "@/domain/tournament/types";
import { calculatePredictionScore } from "@/domain/scoring/scoringEngine";
import type {
  ScoreCategory,
  ScoringRules
} from "@/domain/scoring/scoringRules";
import { getPredictionStatusLabel } from "@/domain/predictions/dashboardSummary";
import { rankThirdPlacedTeams } from "@/domain/tournament/thirdPlacedTeams";
import {
  findPredictionGroupEditorData,
  findPredictionKnockoutEditorData
} from "./predictions.repo";
import { requireCurrentTournament } from "./tournament.repo";
import scoringRulesSeed from "../../../prisma/seed/fifa-2026/scoring-rules.json";

const activeScoringRules = scoringRulesSeed as ScoringRules;

export type LeaderboardDetailItem = {
  label: string;
  description: string;
  points: number;
};

export type LeaderboardDetails = Record<ScoreCategory, LeaderboardDetailItem[]>;

export type LeaderboardEntry = {
  rank: number;
  predictionId: string;
  predictionName: string;
  username: string;
  status: string;
  totalPoints: number;
  breakdown: Prisma.JsonValue;
  details: LeaderboardDetails;
  calculatedAt: Date | null;
};

export async function recalculateAllPredictionScores() {
  const tournament = await requireCurrentTournament();
  const [actualData, predictions] = await Promise.all([
    buildActualScoringData(tournament.id),
    db.prediction.findMany({
      where: { tournamentId: tournament.id },
      include: { user: true }
    })
  ]);

  const calculatedScores = await Promise.all(
    predictions.map(async (prediction) => {
      const predictionData = await buildPredictionScoringData(
        prediction.userId,
        prediction.id
      );

      return {
        predictionId: prediction.id,
        score: calculatePredictionScore({
          rules: activeScoringRules,
          predictedGroupResults: predictionData.predictedGroupResults,
          actualGroupResults: actualData.actualGroupResults,
          predictedQualifiedForR32: predictionData.predictedQualifiedForR32,
          actualQualifiedForR32: actualData.actualQualifiedForR32,
          predictedChampionId: predictionData.predictedChampionId,
          actualChampionId: actualData.actualChampionId
        })
      };
    })
  );

  await db.$transaction(
    calculatedScores.map(({ predictionId, score }) =>
      db.predictionScore.upsert({
        where: { predictionId },
        create: {
          predictionId,
          totalPoints: score.totalPoints,
          breakdown: score.breakdown,
          calculatedAt: new Date()
        },
        update: {
          totalPoints: score.totalPoints,
          breakdown: score.breakdown,
          calculatedAt: new Date()
        }
      })
    )
  );
}

export async function findLeaderboard(): Promise<LeaderboardEntry[]> {
  const tournament = await requireCurrentTournament();
  const predictions = await db.prediction.findMany({
    where: { tournamentId: tournament.id },
    include: {
      user: true,
      score: true
    },
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }]
  });
  const entriesWithStatus = await Promise.all(
    predictions.map(async (prediction) => {
      const [groupMatchesCompleted, knockoutMatchesCompleted, details] =
        await Promise.all([
          db.predictedMatchResult.count({
            where: {
              predictionId: prediction.id,
              match: { stage: "GROUP" },
              homeGoals: { not: null },
              awayGoals: { not: null }
            }
          }),
          db.predictedMatchResult.count({
            where: {
              predictionId: prediction.id,
              match: { stage: { not: "GROUP" } },
              qualifiedTeamId: { not: null }
            }
          }),
          buildLeaderboardDetails(prediction.userId, prediction.id)
        ]);

      return {
        predictionId: prediction.id,
        predictionName: prediction.name,
        username: prediction.user.username,
        status: getPredictionStatusLabel({
          groupMatchesCompleted,
          knockoutMatchesCompleted
        }),
        totalPoints: prediction.score?.totalPoints ?? 0,
        breakdown: prediction.score?.breakdown ?? null,
        details,
        calculatedAt: prediction.score?.calculatedAt ?? null
      };
    })
  );
  const entries = entriesWithStatus.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.predictionName.localeCompare(b.predictionName) ||
      a.username.localeCompare(b.username) ||
      a.predictionId.localeCompare(b.predictionId)
  );

  return entries.map((entry, index) => ({
    rank: index + 1,
    ...entry
  }));
}

async function buildLeaderboardDetails(
  userId: string,
  predictionId: string
): Promise<LeaderboardDetails> {
  const [actualData, predictionData, predictedGroupResults] = await Promise.all(
    [
      buildActualLeaderboardData(),
      buildPredictionLeaderboardData(userId, predictionId),
      db.predictedMatchResult.findMany({
        where: { predictionId, match: { stage: "GROUP" } },
        include: { match: true }
      })
    ]
  );
  const predictedGroupByMatchId = new Map(
    predictedGroupResults.map((result) => [result.matchId, result])
  );
  const details = createEmptyDetails();

  for (const actual of actualData.groupResults) {
    if (!isCompleteScore(actual)) {
      continue;
    }

    const predicted = predictedGroupByMatchId.get(actual.matchId);

    if (!predicted || !isCompleteScore(predicted)) {
      continue;
    }

    const item = {
      label: `${actual.matchNo}: ${actual.homeTeamName} ${actual.homeGoals}-${actual.awayGoals} ${actual.awayTeamName}`,
      description: `Tu prediccion: ${predicted.homeGoals}-${predicted.awayGoals}`,
      points: 0
    };

    if (
      predicted.homeGoals === actual.homeGoals &&
      predicted.awayGoals === actual.awayGoals
    ) {
      details.groupExactScore.push({
        ...item,
        points: activeScoringRules.groupExactScore
      });
      continue;
    }

    if (
      getOutcome(predicted.homeGoals, predicted.awayGoals) ===
      getOutcome(actual.homeGoals, actual.awayGoals)
    ) {
      details.groupOutcome.push({
        ...item,
        points: activeScoringRules.groupOutcome
      });
    }
  }

  const predictedQualified = new Set(
    predictionData.predictedQualifiedForR32.map((team) => team.teamId)
  );

  for (const team of actualData.qualifiedForR32) {
    if (predictedQualified.has(team.teamId)) {
      details.qualifiedForR32.push({
        label: team.teamName,
        description: "Clasificado a ronda de 32",
        points: activeScoringRules.qualifiedForR32
      });
    }
  }

  if (
    actualData.champion &&
    predictionData.champion &&
    actualData.champion.teamId === predictionData.champion.teamId
  ) {
    details.champion.push({
      label: actualData.champion.teamName,
      description: "Campeon acertado",
      points: activeScoringRules.champion
    });
  }

  return details;
}

async function buildActualLeaderboardData() {
  const tournament = await requireCurrentTournament();
  const [actualGroupResults, groups, finalResult] = await Promise.all([
    db.actualMatchResult.findMany({
      where: { match: { tournamentId: tournament.id, stage: "GROUP" } },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
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
          include: { actualResult: true }
        }
      }
    }),
    db.actualMatchResult.findFirst({
      where: { match: { tournamentId: tournament.id, stage: "FINAL" } },
      include: { qualifiedTeam: true }
    })
  ]);
  const groupStandings = buildActualGroupStandings(groups);
  const allGroupsComplete = groupStandings.every((group) => group.standings);
  const qualifiedForR32 = allGroupsComplete
    ? groupStandings.flatMap((group) =>
        (group.standings ?? [])
          .filter((standing) => standing.position <= 2)
          .map((standing) => ({
            teamId: standing.teamId,
            teamName: group.teamNameById.get(standing.teamId) ?? standing.teamId
          }))
      )
    : [];
  const bestThirds = allGroupsComplete
    ? rankThirdPlacedTeams(
        groupStandings.flatMap((group) => {
          const third = group.standings?.find(
            (standing) => standing.position === 3
          );
          const team = group.teams.find(
            (candidate) => candidate.id === third?.teamId
          );

          return third && team
            ? [
                {
                  groupCode: group.code,
                  teamId: third.teamId,
                  points: third.points,
                  goalDifference: third.goalDifference,
                  goalsFor: third.goalsFor,
                  fifaRankingSeed: team.fifaRankingSeed
                }
              ]
            : [];
        })
      )
        .slice(0, 8)
        .map((team) => ({
          teamId: team.teamId,
          teamName:
            groupStandings
              .find((group) => group.teamNameById.has(team.teamId))
              ?.teamNameById.get(team.teamId) ?? team.teamId
        }))
    : [];

  return {
    groupResults: actualGroupResults.map((result) => ({
      matchId: result.matchId,
      matchNo: result.match.matchNo,
      homeTeamName: result.match.homeTeam?.shortName ?? result.match.homeSource,
      awayTeamName: result.match.awayTeam?.shortName ?? result.match.awaySource,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals
    })),
    qualifiedForR32: [...qualifiedForR32, ...bestThirds],
    champion: finalResult?.qualifiedTeamId
      ? {
          teamId: finalResult.qualifiedTeamId,
          teamName:
            finalResult.qualifiedTeam?.name ?? finalResult.qualifiedTeamId
        }
      : null
  };
}

async function buildPredictionLeaderboardData(
  userId: string,
  predictionId: string
) {
  const [groupData, knockoutData] = await Promise.all([
    findPredictionGroupEditorData(userId, predictionId),
    findPredictionKnockoutEditorData(userId, predictionId)
  ]);

  return {
    predictedQualifiedForR32: groupData?.qualificationSummary
      ? [
          ...groupData.qualificationSummary.direct.map((team) => ({
            teamId: team.teamId,
            teamName: team.teamName
          })),
          ...groupData.qualificationSummary.bestThirds.map((team) => ({
            teamId: team.teamId,
            teamName: team.teamName
          }))
        ]
      : [],
    champion: knockoutData?.champion ?? null
  };
}

function buildActualGroupStandings(
  groups: Array<{
    code: string;
    slots: Array<{
      team: {
        id: string;
        name: string;
        fifaCode: string;
        fifaRankingSeed: number;
      };
    }>;
    matches: Array<{
      homeTeamId: string | null;
      awayTeamId: string | null;
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
      fifaCode: team.fifaCode,
      fifaRankingSeed: team.fifaRankingSeed
    }));
    const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
    const completedMatches: GroupMatchResult[] = group.matches.flatMap(
      (match) =>
        match.homeTeamId &&
        match.awayTeamId &&
        match.actualResult?.homeGoals !== null &&
        match.actualResult?.homeGoals !== undefined &&
        match.actualResult.awayGoals !== null &&
        match.actualResult.awayGoals !== undefined
          ? [
              {
                homeTeamId: match.homeTeamId,
                awayTeamId: match.awayTeamId,
                homeGoals: match.actualResult.homeGoals,
                awayGoals: match.actualResult.awayGoals
              }
            ]
          : []
    );

    return {
      code: group.code,
      teams,
      teamNameById,
      standings:
        completedMatches.length === 6
          ? calculateGroupStandings(teams, completedMatches)
          : null
    };
  });
}

function createEmptyDetails(): LeaderboardDetails {
  return {
    groupExactScore: [],
    groupOutcome: [],
    qualifiedForR32: [],
    champion: []
  };
}

function isCompleteScore(result: {
  homeGoals: number | null;
  awayGoals: number | null;
}): result is { homeGoals: number; awayGoals: number } {
  return result.homeGoals !== null && result.awayGoals !== null;
}

function getOutcome(homeGoals: number, awayGoals: number) {
  if (homeGoals > awayGoals) {
    return "HOME";
  }

  if (homeGoals < awayGoals) {
    return "AWAY";
  }

  return "DRAW";
}

async function buildActualScoringData(tournamentId: string) {
  const [actualGroupResults, groups, finalResult] = await Promise.all([
    db.actualMatchResult.findMany({
      where: { match: { tournamentId, stage: "GROUP" } },
      include: { match: true }
    }),
    db.group.findMany({
      where: { tournamentId },
      orderBy: { code: "asc" },
      include: {
        slots: {
          orderBy: { slot: "asc" },
          include: { team: true }
        },
        matches: {
          where: { stage: "GROUP" },
          include: { actualResult: true }
        }
      }
    }),
    db.actualMatchResult.findFirst({
      where: { match: { tournamentId, stage: "FINAL" } }
    })
  ]);
  const groupStandings = groups.map((group) => {
    const teams = group.slots.map(({ team }) => ({
      id: team.id,
      name: team.name,
      fifaCode: team.fifaCode,
      fifaRankingSeed: team.fifaRankingSeed
    }));
    const completedMatches: GroupMatchResult[] = group.matches.flatMap(
      (match) =>
        match.homeTeamId &&
        match.awayTeamId &&
        match.actualResult?.homeGoals !== null &&
        match.actualResult?.homeGoals !== undefined &&
        match.actualResult.awayGoals !== null &&
        match.actualResult.awayGoals !== undefined
          ? [
              {
                homeTeamId: match.homeTeamId,
                awayTeamId: match.awayTeamId,
                homeGoals: match.actualResult.homeGoals,
                awayGoals: match.actualResult.awayGoals
              }
            ]
          : []
    );

    return {
      code: group.code,
      teams,
      standings:
        completedMatches.length === 6
          ? calculateGroupStandings(teams, completedMatches)
          : null
    };
  });
  const allGroupsComplete = groupStandings.every((group) => group.standings);
  const directQualified = allGroupsComplete
    ? groupStandings.flatMap((group) =>
        (group.standings ?? [])
          .filter((standing) => standing.position <= 2)
          .map((standing) => standing.teamId)
      )
    : [];
  const bestThirds = allGroupsComplete
    ? rankThirdPlacedTeams(
        groupStandings.flatMap((group) => {
          const third = group.standings?.find(
            (standing) => standing.position === 3
          );
          const team = group.teams.find(
            (candidate) => candidate.id === third?.teamId
          );

          return third && team
            ? [
                {
                  groupCode: group.code,
                  teamId: third.teamId,
                  points: third.points,
                  goalDifference: third.goalDifference,
                  goalsFor: third.goalsFor,
                  fifaRankingSeed: team.fifaRankingSeed
                }
              ]
            : [];
        })
      )
        .slice(0, 8)
        .map((team) => team.teamId)
    : [];

  return {
    actualGroupResults: actualGroupResults.map((result) => ({
      matchId: result.matchId,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals
    })),
    actualQualifiedForR32: [...directQualified, ...bestThirds],
    actualChampionId: finalResult?.qualifiedTeamId ?? null
  };
}

async function buildPredictionScoringData(
  userId: string,
  predictionId: string
) {
  const [groupResults, groupData, knockoutData] = await Promise.all([
    db.predictedMatchResult.findMany({
      where: { predictionId, match: { stage: "GROUP" } }
    }),
    findPredictionGroupEditorData(userId, predictionId),
    findPredictionKnockoutEditorData(userId, predictionId)
  ]);

  return {
    predictedGroupResults: groupResults.map((result) => ({
      matchId: result.matchId,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals
    })),
    predictedQualifiedForR32: groupData?.qualificationSummary
      ? [
          ...groupData.qualificationSummary.direct.map((team) => team.teamId),
          ...groupData.qualificationSummary.bestThirds.map(
            (team) => team.teamId
          )
        ]
      : [],
    predictedChampionId: knockoutData?.champion?.teamId ?? null
  };
}
