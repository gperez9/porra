"use client";

import { Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { formatTeamOptionLabel, TeamLabel } from "@/components/team-label";
import {
  saveKnockoutPredictionAction,
  type KnockoutPredictionActionState
} from "./actions";

type KnockoutEditorMatch = {
  id: string;
  matchNo: string;
  stage: "R32" | "R16" | "QF" | "SF" | "THIRD_PLACE" | "FINAL";
  homeSource: string;
  awaySource: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeTeamFlagCode: string | null;
  awayTeamFlagCode: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId: string | null;
  ready: boolean;
};

type KnockoutPredictionEditorProps = {
  predictionId: string;
  matches: KnockoutEditorMatch[];
};

type TeamSide = {
  id: string;
  name: string;
  flagCode: string | null;
};

type KnockoutEditorMatchState = KnockoutEditorMatch & {
  homeGoalsValue: string;
  awayGoalsValue: string;
  homeTeam: TeamSide | null;
  awayTeam: TeamSide | null;
};

const initialState: KnockoutPredictionActionState = {
  error: null,
  saved: false
};

const stageLabels: Record<KnockoutEditorMatch["stage"], string> = {
  R32: "Ronda de 32",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final"
};

const stages: KnockoutEditorMatch["stage"][] = [
  "R32",
  "R16",
  "QF",
  "SF",
  "THIRD_PLACE",
  "FINAL"
];

export function KnockoutPredictionEditor({
  predictionId,
  matches
}: KnockoutPredictionEditorProps) {
  const [state, formAction, isPending] = useActionState(
    saveKnockoutPredictionAction,
    initialState
  );
  const initialMatches = useMemo(() => initializeMatches(matches), [matches]);
  const [liveMatches, setLiveMatches] = useState(initialMatches);

  function updateMatch(
    matchId: string,
    updater: (match: KnockoutEditorMatchState) => KnockoutEditorMatchState
  ) {
    setLiveMatches((currentMatches) =>
      resolveLiveBracket(
        currentMatches.map((match) =>
          match.id === matchId ? updater(match) : match
        )
      )
    );
  }

  return (
    <form
      action={formAction}
      className="grid gap-8 py-6"
      onReset={(event) => event.preventDefault()}
    >
      <input name="predictionId" type="hidden" value={predictionId} />

      {stages.map((stage) => {
        const stageMatches = liveMatches.filter(
          (match) => match.stage === stage
        );

        if (stageMatches.length === 0) {
          return null;
        }

        return (
          <section className="grid gap-3" key={stage}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{stageLabels[stage]}</h2>
              <span className="text-sm font-semibold text-[var(--muted)]">
                {stageMatches.filter((match) => match.qualifiedTeamId).length}/
                {stageMatches.length}
              </span>
            </div>

            <div className="grid gap-3">
              {stageMatches.map((match) => (
                <KnockoutMatchRow
                  key={getMatchRenderKey(match)}
                  match={match}
                  onMatchChange={updateMatch}
                />
              ))}
            </div>
          </section>
        );
      })}

      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      {state.saved ? (
        <p
          aria-live="polite"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          Eliminatorias guardadas.
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70 sm:justify-self-start"
        disabled={isPending}
        type="submit"
      >
        <Save aria-hidden="true" size={18} />
        {isPending ? "Guardando..." : "Guardar eliminatorias"}
      </button>
    </form>
  );
}

function KnockoutMatchRow({
  match,
  onMatchChange
}: {
  match: KnockoutEditorMatchState;
  onMatchChange: (
    matchId: string,
    updater: (match: KnockoutEditorMatchState) => KnockoutEditorMatchState
  ) => void;
}) {
  const automaticQualifiedTeamId = getAutomaticQualifiedTeamId(
    match,
    match.homeGoalsValue,
    match.awayGoalsValue
  );
  const selectedQualifiedTeamId =
    match.qualifiedTeamId ?? automaticQualifiedTeamId;
  const canChooseQualifiedTeam = canChooseQualifiedTeamByPenalties(match);
  const selectHint = getQualifiedHint(
    match,
    automaticQualifiedTeamId,
    canChooseQualifiedTeam
  );
  const qualifiedInputName = `qualifiedTeamId:${match.id}`;

  return (
    <article
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      data-knockout-match
    >
      <input name="matchId" type="hidden" value={match.id} />

      <div className="grid gap-3 lg:grid-cols-[5rem_1fr_4.5rem_4.5rem_1fr_12rem] lg:items-center">
        <span className="text-xs font-semibold text-[var(--muted)]">
          {match.matchNo}
        </span>

        <TeamLabel
          className="font-medium"
          flagCode={match.homeTeam?.flagCode}
          name={match.homeTeam?.name ?? match.homeSource}
        />

        <input
          aria-label={`${match.homeTeam?.name ?? match.homeSource} goles`}
          className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          data-score-field="home"
          disabled={!match.ready}
          inputMode="numeric"
          min={0}
          name={`homeGoals:${match.id}`}
          onInput={(event) => {
            const homeGoalsValue = event.currentTarget.value;
            onMatchChange(match.id, (currentMatch) =>
              withUpdatedScores(
                currentMatch,
                homeGoalsValue,
                currentMatch.awayGoalsValue
              )
            );
          }}
          pattern="[0-9]*"
          type="number"
          value={match.homeGoalsValue}
        />

        <input
          aria-label={`${match.awayTeam?.name ?? match.awaySource} goles`}
          className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          data-score-field="away"
          disabled={!match.ready}
          inputMode="numeric"
          min={0}
          name={`awayGoals:${match.id}`}
          onInput={(event) => {
            const awayGoalsValue = event.currentTarget.value;
            onMatchChange(match.id, (currentMatch) =>
              withUpdatedScores(
                currentMatch,
                currentMatch.homeGoalsValue,
                awayGoalsValue
              )
            );
          }}
          pattern="[0-9]*"
          type="number"
          value={match.awayGoalsValue}
        />

        <TeamLabel
          align="right"
          className="font-medium lg:text-right"
          flagCode={match.awayTeam?.flagCode}
          name={match.awayTeam?.name ?? match.awaySource}
        />

        <label className="grid gap-1">
          <span className="sr-only">Clasificado {match.matchNo}</span>
          {!canChooseQualifiedTeam ? (
            <input
              name={qualifiedInputName}
              type="hidden"
              value={selectedQualifiedTeamId}
            />
          ) : null}
          <select
            aria-describedby={`qualified-hint-${match.id}`}
            aria-label={`Clasificado ${match.matchNo}`}
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-white px-2 text-sm outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            data-qualified-select
            disabled={!canChooseQualifiedTeam}
            name={canChooseQualifiedTeam ? qualifiedInputName : undefined}
            onChange={(event) => {
              const qualifiedTeamId = event.currentTarget.value || null;
              onMatchChange(match.id, (currentMatch) => ({
                ...currentMatch,
                qualifiedTeamId
              }));
            }}
            value={selectedQualifiedTeamId}
          >
            <option value="">Clasifica...</option>
            {match.homeTeam ? (
              <option value={match.homeTeam.id}>
                {formatTeamOptionLabel(
                  match.homeTeam.name,
                  match.homeTeam.flagCode
                )}
              </option>
            ) : null}
            {match.awayTeam ? (
              <option value={match.awayTeam.id}>
                {formatTeamOptionLabel(
                  match.awayTeam.name,
                  match.awayTeam.flagCode
                )}
              </option>
            ) : null}
          </select>
          <span
            className="text-xs text-[var(--muted)]"
            data-qualified-hint
            id={`qualified-hint-${match.id}`}
          >
            {selectHint}
          </span>
        </label>
      </div>
    </article>
  );
}

function getMatchRenderKey(match: KnockoutEditorMatchState) {
  return [match.id, match.homeTeam?.id ?? "", match.awayTeam?.id ?? ""].join(
    ":"
  );
}

function getAutomaticQualifiedTeamId(
  match: KnockoutEditorMatch,
  homeGoals: string,
  awayGoals: string
) {
  const home = parseScore(homeGoals);
  const away = parseScore(awayGoals);

  if (home === null || away === null || home === away) {
    return "";
  }

  return home > away ? (match.homeTeamId ?? "") : (match.awayTeamId ?? "");
}

function getQualifiedHint(
  match: KnockoutEditorMatchState,
  automaticQualifiedTeamId: string,
  canChooseQualifiedTeam: boolean
) {
  const home = parseScore(match.homeGoalsValue);
  const away = parseScore(match.awayGoalsValue);

  if (home === null || away === null) {
    return "Completa el marcador para calcular el clasificado.";
  }

  if (canChooseQualifiedTeam) {
    return "Empate: elige el clasificado por penaltis.";
  }

  if (!automaticQualifiedTeamId) {
    return "Completa el marcador para calcular el clasificado.";
  }

  const teamName =
    automaticQualifiedTeamId === match.homeTeam?.id
      ? match.homeTeam.name
      : match.awayTeam?.name;

  return teamName
    ? `Clasifica ${teamName} por el marcador.`
    : "Clasificado calculado por el marcador.";
}

function canChooseQualifiedTeamByPenalties(match: KnockoutEditorMatchState) {
  const home = parseScore(match.homeGoalsValue);
  const away = parseScore(match.awayGoalsValue);

  return match.ready && home !== null && away !== null && home === away;
}

function initializeMatches(matches: KnockoutEditorMatch[]) {
  return resolveLiveBracket(
    matches.map((match) => ({
      ...match,
      homeGoalsValue: stringifyNullableScore(match.homeGoals),
      awayGoalsValue: stringifyNullableScore(match.awayGoals),
      homeTeam: buildTeamSide(
        match.homeTeamId,
        match.homeTeamName,
        match.homeTeamFlagCode
      ),
      awayTeam: buildTeamSide(
        match.awayTeamId,
        match.awayTeamName,
        match.awayTeamFlagCode
      )
    }))
  );
}

function stringifyNullableScore(score: number | null) {
  return score === null ? "" : String(score);
}

function buildTeamSide(
  id: string | null,
  name: string | null,
  flagCode: string | null
): TeamSide | null {
  return id && name ? { id, name, flagCode } : null;
}

function withUpdatedScores(
  match: KnockoutEditorMatchState,
  homeGoalsValue: string,
  awayGoalsValue: string
) {
  const automaticQualifiedTeamId = getAutomaticQualifiedTeamId(
    match,
    homeGoalsValue,
    awayGoalsValue
  );
  const home = parseScore(homeGoalsValue);
  const away = parseScore(awayGoalsValue);

  return {
    ...match,
    homeGoalsValue,
    awayGoalsValue,
    qualifiedTeamId:
      automaticQualifiedTeamId ||
      (home !== null && away !== null && home === away
        ? match.qualifiedTeamId
        : null)
  };
}

function resolveLiveBracket(matches: KnockoutEditorMatchState[]) {
  const resolvedByMatchNo = new Map<string, KnockoutEditorMatchState>();
  const resolvedMatches = [...matches]
    .sort((left, right) => getMatchNumber(left) - getMatchNumber(right))
    .map((match) => {
      const homeTeam =
        match.stage === "R32"
          ? match.homeTeam
          : resolveSourceTeam(match.homeSource, resolvedByMatchNo);
      const awayTeam =
        match.stage === "R32"
          ? match.awayTeam
          : resolveSourceTeam(match.awaySource, resolvedByMatchNo);
      const teamsChanged =
        match.stage !== "R32" &&
        (match.homeTeam?.id !== homeTeam?.id ||
          match.awayTeam?.id !== awayTeam?.id);
      const resolvedMatch = teamsChanged
        ? {
            ...match,
            homeGoals: null,
            awayGoals: null,
            homeGoalsValue: "",
            awayGoalsValue: "",
            qualifiedTeamId: null,
            homeTeam,
            awayTeam
          }
        : {
            ...match,
            homeTeam,
            awayTeam
          };
      const ready =
        resolvedMatch.homeTeam !== null && resolvedMatch.awayTeam !== null;
      const validQualifiedTeamIds = [
        resolvedMatch.homeTeam?.id,
        resolvedMatch.awayTeam?.id
      ];
      const qualifiedTeamId =
        ready &&
        resolvedMatch.qualifiedTeamId !== null &&
        validQualifiedTeamIds.includes(resolvedMatch.qualifiedTeamId)
          ? resolvedMatch.qualifiedTeamId
          : null;
      const normalizedMatch = {
        ...resolvedMatch,
        homeTeamId: resolvedMatch.homeTeam?.id ?? null,
        awayTeamId: resolvedMatch.awayTeam?.id ?? null,
        homeTeamName: resolvedMatch.homeTeam?.name ?? null,
        awayTeamName: resolvedMatch.awayTeam?.name ?? null,
        homeTeamFlagCode: resolvedMatch.homeTeam?.flagCode ?? null,
        awayTeamFlagCode: resolvedMatch.awayTeam?.flagCode ?? null,
        homeGoals:
          parseScore(resolvedMatch.homeGoalsValue) ?? resolvedMatch.homeGoals,
        awayGoals:
          parseScore(resolvedMatch.awayGoalsValue) ?? resolvedMatch.awayGoals,
        qualifiedTeamId,
        ready
      };

      resolvedByMatchNo.set(normalizedMatch.matchNo, normalizedMatch);
      return normalizedMatch;
    });

  return resolvedMatches.sort(
    (left, right) => getMatchNumber(left) - getMatchNumber(right)
  );
}

function resolveSourceTeam(
  source: string,
  resolvedByMatchNo: Map<string, KnockoutEditorMatchState>
) {
  const sourceType = source.at(0);
  const sourceMatch = resolvedByMatchNo.get(`M${source.slice(1)}`);

  if (!sourceMatch?.homeTeam || !sourceMatch.awayTeam) {
    return null;
  }

  if (sourceType === "W") {
    return getWinner(sourceMatch);
  }

  if (sourceType === "L") {
    const winner = getWinner(sourceMatch);

    if (!winner) {
      return null;
    }

    return winner.id === sourceMatch.homeTeam.id
      ? sourceMatch.awayTeam
      : sourceMatch.homeTeam;
  }

  return null;
}

function getWinner(match: KnockoutEditorMatchState) {
  if (!match.homeTeam || !match.awayTeam || !match.qualifiedTeamId) {
    return null;
  }

  if (match.qualifiedTeamId === match.homeTeam.id) {
    return match.homeTeam;
  }

  if (match.qualifiedTeamId === match.awayTeam.id) {
    return match.awayTeam;
  }

  return null;
}

function getMatchNumber(match: KnockoutEditorMatch) {
  return Number(match.matchNo.replace("M", ""));
}

function parseScore(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue >= 0
    ? numericValue
    : null;
}
