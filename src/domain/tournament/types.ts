export type Stage =
  | "GROUP"
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "THIRD_PLACE"
  | "FINAL";

export type TeamSeed = {
  id: string;
  name: string;
  fifaCode: string;
  fifaRankingSeed: number;
  fairPlayPoints?: number;
};

export type GroupMatchResult = {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
};
