export type ScoringRules = {
  groupExactScore: number;
  groupOutcome: number;
  qualifiedForR32: number;
  champion: number;
};

export type ScoreCategory =
  | "groupExactScore"
  | "groupOutcome"
  | "qualifiedForR32"
  | "champion";

export const defaultScoringRules: ScoringRules = {
  groupExactScore: 3,
  groupOutcome: 1,
  qualifiedForR32: 2,
  champion: 20
};
