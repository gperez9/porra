export type ThirdPlacedTeam = {
  groupCode: string;
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  fairPlayPoints?: number;
  fifaRankingSeed: number;
};

export function rankThirdPlacedTeams(teams: ThirdPlacedTeam[]) {
  return [...teams].sort((a, b) => {
    const points = b.points - a.points;
    if (points !== 0) return points;

    const goalDifference = b.goalDifference - a.goalDifference;
    if (goalDifference !== 0) return goalDifference;

    const goalsFor = b.goalsFor - a.goalsFor;
    if (goalsFor !== 0) return goalsFor;

    const fairPlay = (a.fairPlayPoints ?? 0) - (b.fairPlayPoints ?? 0);
    if (fairPlay !== 0) return fairPlay;

    return a.fifaRankingSeed - b.fifaRankingSeed;
  });
}

export function selectBestThirdPlacedTeams(teams: ThirdPlacedTeam[]) {
  const rankedTeams = rankThirdPlacedTeams(teams);

  return {
    qualified: rankedTeams.slice(0, 8),
    eliminated: rankedTeams.slice(8)
  };
}
