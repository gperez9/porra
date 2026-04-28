export type PenaltyDecision = {
  decidedByPenalties: boolean;
  penaltyWinnerTeamId: string | null;
};

export function requiresPenaltyWinner(homeGoals: number, awayGoals: number) {
  return homeGoals === awayGoals;
}
