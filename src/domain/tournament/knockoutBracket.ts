export type KnockoutSlotSource =
  | { type: "TEAM"; teamId: string }
  | { type: "GROUP_POSITION"; groupCode: string; position: 1 | 2 }
  | { type: "THIRD_PLACE_COMBINATION"; groups: string[] }
  | { type: "WINNER"; matchNo: number }
  | { type: "LOSER"; matchNo: number };

export type KnockoutTemplateMatch = {
  matchNo: string;
  stage: "R32" | "R16" | "QF" | "SF" | "THIRD_PLACE" | "FINAL";
  homeSource: string;
  awaySource: string;
  order: number;
};

export type ThirdPlaceCombination = {
  combination: string;
  assignments: Record<string, string>;
};

export type QualifiedGroupTeam = {
  groupCode: string;
  position: 1 | 2 | 3;
  teamId: string;
};

export type ResolvedKnockoutMatch = KnockoutTemplateMatch & {
  homeTeamId: string | null;
  awayTeamId: string | null;
  qualifiedTeamId?: string | null;
};

export type KnockoutMatchResult = {
  matchNo: string;
  qualifiedTeamId: string | null;
};

export type KnockoutPredictionValidationResult =
  | {
      ok: true;
      value: {
        homeGoals: number | null;
        awayGoals: number | null;
        decidedByPenalties: boolean;
        penaltyWinnerTeamId: string | null;
        qualifiedTeamId: string | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

export function getThirdPlaceCombinationKey(groupCodes: string[]): string {
  return [...new Set(groupCodes)].sort().join("");
}

export function resolveThirdPlaceAssignments(
  qualifiedThirdGroupCodes: string[],
  combinations: ThirdPlaceCombination[]
) {
  const key = getThirdPlaceCombinationKey(qualifiedThirdGroupCodes);

  if (qualifiedThirdGroupCodes.length !== 8 || key.length !== 8) {
    throw new Error(
      `Expected exactly 8 distinct qualified third-place groups, received ${qualifiedThirdGroupCodes.length}.`
    );
  }

  const combination = combinations.find((entry) => entry.combination === key);

  if (!combination) {
    throw new Error(`Missing third-place combination seed for ${key}.`);
  }

  return combination.assignments;
}

export function buildRoundOf32Matches(
  qualifiedTeams: QualifiedGroupTeam[],
  template: KnockoutTemplateMatch[],
  combinations: ThirdPlaceCombination[]
): ResolvedKnockoutMatch[] {
  const r32Template = template
    .filter((match) => match.stage === "R32")
    .sort((a, b) => a.order - b.order);
  const teamBySource = new Map(
    qualifiedTeams
      .filter((team) => team.position !== 3)
      .map((team) => [`${team.position}${team.groupCode}`, team.teamId])
  );
  const thirdTeamByGroup = new Map(
    qualifiedTeams
      .filter((team) => team.position === 3)
      .map((team) => [team.groupCode, team.teamId])
  );
  const thirdAssignments = resolveThirdPlaceAssignments(
    [...thirdTeamByGroup.keys()],
    combinations
  );

  return r32Template.map((match) => ({
    ...match,
    homeTeamId: resolveTeamId(match.homeSource, teamBySource, thirdTeamByGroup),
    awayTeamId: resolveTeamId(
      match.awaySource,
      teamBySource,
      thirdTeamByGroup,
      thirdAssignments,
      match.matchNo
    )
  }));
}

export function resolveKnockoutBracket(
  template: KnockoutTemplateMatch[],
  roundOf32Matches: ResolvedKnockoutMatch[],
  results: KnockoutMatchResult[]
): ResolvedKnockoutMatch[] {
  const resultsByMatchNo = new Map(
    results.map((result) => [result.matchNo, result])
  );
  const resolvedByMatchNo = new Map(
    roundOf32Matches.map((match) => [
      match.matchNo,
      withValidQualifiedTeam(match, resultsByMatchNo.get(match.matchNo))
    ])
  );

  for (const match of [...template].sort((a, b) => a.order - b.order)) {
    if (match.stage === "R32") {
      continue;
    }

    const resolvedMatch = {
      ...match,
      homeTeamId: resolveKnockoutSource(match.homeSource, resolvedByMatchNo),
      awayTeamId: resolveKnockoutSource(match.awaySource, resolvedByMatchNo),
      qualifiedTeamId: null
    };

    resolvedByMatchNo.set(
      match.matchNo,
      withValidQualifiedTeam(resolvedMatch, resultsByMatchNo.get(match.matchNo))
    );
  }

  return [...resolvedByMatchNo.values()].sort((a, b) => a.order - b.order);
}

export function validateKnockoutPrediction(input: {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId: string | null;
}): KnockoutPredictionValidationResult {
  const isEmpty =
    input.homeGoals === null &&
    input.awayGoals === null &&
    input.qualifiedTeamId === null;

  if (isEmpty) {
    return {
      ok: true,
      value: {
        homeGoals: null,
        awayGoals: null,
        decidedByPenalties: false,
        penaltyWinnerTeamId: null,
        qualifiedTeamId: null
      }
    };
  }

  if (!input.homeTeamId || !input.awayTeamId) {
    return {
      ok: false,
      error: "El partido todavia no tiene los dos equipos definidos."
    };
  }

  if (input.homeGoals === null || input.awayGoals === null) {
    return {
      ok: false,
      error: "Completa ambos marcadores del partido o deja ambos en blanco."
    };
  }

  if (!input.qualifiedTeamId) {
    return {
      ok: false,
      error: "Selecciona el equipo clasificado."
    };
  }

  const validQualifiedTeamIds = [input.homeTeamId, input.awayTeamId];

  if (!validQualifiedTeamIds.includes(input.qualifiedTeamId)) {
    return {
      ok: false,
      error: "El clasificado debe ser uno de los dos equipos del partido."
    };
  }

  if (input.homeGoals === input.awayGoals) {
    return {
      ok: true,
      value: {
        homeGoals: input.homeGoals,
        awayGoals: input.awayGoals,
        decidedByPenalties: true,
        penaltyWinnerTeamId: input.qualifiedTeamId,
        qualifiedTeamId: input.qualifiedTeamId
      }
    };
  }

  const scoreWinnerTeamId =
    input.homeGoals > input.awayGoals ? input.homeTeamId : input.awayTeamId;

  if (input.qualifiedTeamId !== scoreWinnerTeamId) {
    return {
      ok: false,
      error: "El clasificado debe coincidir con el ganador del marcador."
    };
  }

  return {
    ok: true,
    value: {
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      decidedByPenalties: false,
      penaltyWinnerTeamId: null,
      qualifiedTeamId: input.qualifiedTeamId
    }
  };
}

export function assertRoundOf32Complete(matches: ResolvedKnockoutMatch[]) {
  const incompleteMatch = matches.find(
    (match) => !match.homeTeamId || !match.awayTeamId
  );

  if (incompleteMatch) {
    throw new Error(
      `Round of 32 match ${incompleteMatch.matchNo} is incomplete.`
    );
  }
}

function resolveTeamId(
  source: string,
  teamBySource: Map<string, string>,
  thirdTeamByGroup: Map<string, string>,
  thirdAssignments?: Record<string, string>,
  matchNo?: string
) {
  if (source.startsWith("3")) {
    if (!thirdAssignments || !matchNo) {
      return null;
    }

    const groupCode = thirdAssignments[matchNo];
    return groupCode ? (thirdTeamByGroup.get(groupCode) ?? null) : null;
  }

  return teamBySource.get(source) ?? null;
}

function resolveKnockoutSource(
  source: string,
  resolvedByMatchNo: Map<string, ResolvedKnockoutMatch>
) {
  const sourceType = source.at(0);
  const sourceMatchNo = `M${source.slice(1)}`;
  const sourceMatch = resolvedByMatchNo.get(sourceMatchNo);

  if (!sourceMatch) {
    return null;
  }

  if (sourceType === "W") {
    return sourceMatch.qualifiedTeamId ?? null;
  }

  if (sourceType === "L") {
    if (
      !sourceMatch.homeTeamId ||
      !sourceMatch.awayTeamId ||
      !sourceMatch.qualifiedTeamId
    ) {
      return null;
    }

    return sourceMatch.qualifiedTeamId === sourceMatch.homeTeamId
      ? sourceMatch.awayTeamId
      : sourceMatch.homeTeamId;
  }

  return null;
}

function withValidQualifiedTeam(
  match: ResolvedKnockoutMatch,
  result?: KnockoutMatchResult
): ResolvedKnockoutMatch {
  const qualifiedTeamId = result?.qualifiedTeamId ?? null;

  if (
    qualifiedTeamId &&
    (qualifiedTeamId === match.homeTeamId ||
      qualifiedTeamId === match.awayTeamId)
  ) {
    return {
      ...match,
      qualifiedTeamId
    };
  }

  return {
    ...match,
    qualifiedTeamId: null
  };
}
