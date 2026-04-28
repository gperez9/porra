export type TieBreakReason =
  | "POINTS"
  | "HEAD_TO_HEAD_POINTS"
  | "HEAD_TO_HEAD_GOAL_DIFFERENCE"
  | "HEAD_TO_HEAD_GOALS_FOR"
  | "GOAL_DIFFERENCE"
  | "GOALS_FOR"
  | "FAIR_PLAY"
  | "FIFA_RANKING_SEED";

export type TieBreakMeta = {
  reasons: TieBreakReason[];
  decidedByRankingSeed: boolean;
};

export function createTieBreakMeta(
  reasons: TieBreakReason[] = []
): TieBreakMeta {
  return {
    reasons,
    decidedByRankingSeed: reasons.includes("FIFA_RANKING_SEED")
  };
}
