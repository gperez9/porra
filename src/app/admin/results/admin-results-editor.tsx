"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { formatTeamOptionLabel, TeamLabel } from "@/components/team-label";
import {
  saveActualGroupResultsAction,
  saveActualKnockoutResultsAction,
  type AdminResultsActionState
} from "./actions";

type AdminGroupResult = {
  code: string;
  teams: Array<{ id: string; name: string; flagCode: string }>;
  matches: Array<{
    id: string;
    matchNo: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamFlagCode: string | null;
    awayTeamFlagCode: string | null;
    homeGoals: number | null;
    awayGoals: number | null;
  }>;
  standings: Array<{
    teamId: string;
    position: number;
    points: number;
    goalDifference: number;
  }> | null;
};

type AdminKnockoutMatch = {
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

const initialState: AdminResultsActionState = {
  error: null,
  saved: false
};

const stageLabels: Record<AdminKnockoutMatch["stage"], string> = {
  R32: "Ronda de 32",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final"
};

const stages: AdminKnockoutMatch["stage"][] = [
  "R32",
  "R16",
  "QF",
  "SF",
  "THIRD_PLACE",
  "FINAL"
];

export function AdminGroupResultsEditor({
  groups
}: {
  groups: AdminGroupResult[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveActualGroupResultsAction,
    initialState
  );

  return (
    <form action={formAction} className="grid gap-5">
      {groups.map((group) => {
        const teamById = new Map(group.teams.map((team) => [team.id, team]));

        return (
          <section
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            key={group.code}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Grupo {group.code}</h2>
              <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                {group.standings ? "Completo" : "Pendiente"}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {group.matches.map((match) => (
                <div
                  className="grid items-center gap-3 rounded-md border border-[var(--border)] p-3 sm:grid-cols-[5rem_1fr_4rem_4rem_1fr]"
                  key={match.id}
                >
                  <input name="matchId" type="hidden" value={match.id} />
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {match.matchNo}
                  </span>
                  <TeamLabel
                    className="font-medium"
                    flagCode={match.homeTeamFlagCode}
                    name={match.homeTeamName}
                  />
                  <input
                    aria-label={`${match.homeTeamName} goles reales`}
                    className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)]"
                    defaultValue={match.homeGoals ?? ""}
                    inputMode="numeric"
                    min={0}
                    name={`homeGoals:${match.id}`}
                    pattern="[0-9]*"
                    type="number"
                  />
                  <input
                    aria-label={`${match.awayTeamName} goles reales`}
                    className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)]"
                    defaultValue={match.awayGoals ?? ""}
                    inputMode="numeric"
                    min={0}
                    name={`awayGoals:${match.id}`}
                    pattern="[0-9]*"
                    type="number"
                  />
                  <TeamLabel
                    align="right"
                    className="font-medium sm:text-right"
                    flagCode={match.awayTeamFlagCode}
                    name={match.awayTeamName}
                  />
                </div>
              ))}
            </div>

            {group.standings ? (
              <ol className="mt-4 grid gap-2 text-sm">
                {group.standings.map((standing) => (
                  <li
                    className="flex items-center justify-between gap-3"
                    key={standing.teamId}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>{standing.position}.</span>
                      {teamById.get(standing.teamId) ? (
                        <TeamLabel
                          flagCode={teamById.get(standing.teamId)?.flagCode}
                          name={teamById.get(standing.teamId)?.name}
                        />
                      ) : null}
                    </span>
                    <span className="font-semibold">
                      {standing.points} pts · DG {standing.goalDifference}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        );
      })}

      <ActionFeedback state={state} />
      <SaveButton label="Guardar grupos reales" pending={isPending} />
    </form>
  );
}

export function AdminKnockoutResultsEditor({
  matches
}: {
  matches: AdminKnockoutMatch[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveActualKnockoutResultsAction,
    initialState
  );

  return (
    <form action={formAction} className="grid gap-6">
      {stages.map((stage) => {
        const stageMatches = matches.filter((match) => match.stage === stage);

        if (stageMatches.length === 0) {
          return null;
        }

        return (
          <section className="grid gap-3" key={stage}>
            <h2 className="text-lg font-bold">{stageLabels[stage]}</h2>
            {stageMatches.map((match) => (
              <AdminKnockoutMatchRow
                key={getMatchRenderKey(match)}
                match={match}
              />
            ))}
          </section>
        );
      })}

      <ActionFeedback state={state} />
      <SaveButton label="Guardar eliminatorias reales" pending={isPending} />
    </form>
  );
}

function AdminKnockoutMatchRow({ match }: { match: AdminKnockoutMatch }) {
  const automaticQualifiedTeamId = getAutomaticQualifiedTeamId(
    match,
    stringifyScore(match.homeGoals),
    stringifyScore(match.awayGoals)
  );
  const selectedQualifiedTeamId =
    match.qualifiedTeamId ?? automaticQualifiedTeamId;
  const selectHint = getQualifiedHint(match, automaticQualifiedTeamId);

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
          flagCode={match.homeTeamFlagCode}
          name={match.homeTeamName ?? match.homeSource}
        />
        <input
          aria-label={`${match.homeTeamName ?? match.homeSource} goles reales`}
          className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          data-score-field="home"
          defaultValue={match.homeGoals ?? ""}
          disabled={!match.ready}
          inputMode="numeric"
          min={0}
          name={`homeGoals:${match.id}`}
          onInput={(event) => updateQualifiedSelect(event.currentTarget, match)}
          pattern="[0-9]*"
          type="number"
        />
        <input
          aria-label={`${match.awayTeamName ?? match.awaySource} goles reales`}
          className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          data-score-field="away"
          defaultValue={match.awayGoals ?? ""}
          disabled={!match.ready}
          inputMode="numeric"
          min={0}
          name={`awayGoals:${match.id}`}
          onInput={(event) => updateQualifiedSelect(event.currentTarget, match)}
          pattern="[0-9]*"
          type="number"
        />
        <TeamLabel
          align="right"
          className="font-medium lg:text-right"
          flagCode={match.awayTeamFlagCode}
          name={match.awayTeamName ?? match.awaySource}
        />
        <label className="grid gap-1">
          <span className="sr-only">Clasificado real {match.matchNo}</span>
          <select
            aria-describedby={`actual-qualified-hint-${match.id}`}
            aria-label={`Clasificado real ${match.matchNo}`}
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-white px-2 text-sm outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            data-qualified-select
            defaultValue={selectedQualifiedTeamId}
            disabled={!match.ready}
            name={`qualifiedTeamId:${match.id}`}
            onChange={(event) =>
              updateQualifiedSelect(event.currentTarget, match)
            }
          >
            <option value="">Clasifica...</option>
            {match.homeTeamId && match.homeTeamName ? (
              <option value={match.homeTeamId}>
                {formatTeamOptionLabel(
                  match.homeTeamName,
                  match.homeTeamFlagCode
                )}
              </option>
            ) : null}
            {match.awayTeamId && match.awayTeamName ? (
              <option value={match.awayTeamId}>
                {formatTeamOptionLabel(
                  match.awayTeamName,
                  match.awayTeamFlagCode
                )}
              </option>
            ) : null}
          </select>
          <span
            className="text-xs text-[var(--muted)]"
            data-qualified-hint
            id={`actual-qualified-hint-${match.id}`}
          >
            {selectHint}
          </span>
        </label>
      </div>
    </article>
  );
}

function ActionFeedback({ state }: { state: AdminResultsActionState }) {
  return (
    <>
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
          Resultados guardados.
        </p>
      ) : null}
    </>
  );
}

function SaveButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70 sm:justify-self-start"
      disabled={pending}
      type="submit"
    >
      <Save aria-hidden="true" size={18} />
      {pending ? "Guardando..." : label}
    </button>
  );
}

function stringifyScore(score: number | null) {
  return score === null ? "" : String(score);
}

function getMatchRenderKey(match: AdminKnockoutMatch) {
  return [
    match.id,
    match.homeTeamId ?? "",
    match.awayTeamId ?? "",
    match.homeGoals ?? "",
    match.awayGoals ?? "",
    match.qualifiedTeamId ?? ""
  ].join(":");
}

function getAutomaticQualifiedTeamId(
  match: AdminKnockoutMatch,
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
  match: AdminKnockoutMatch,
  automaticQualifiedTeamId: string
) {
  if (!automaticQualifiedTeamId) {
    return "En empate, elige el clasificado por penaltis.";
  }

  const teamName =
    automaticQualifiedTeamId === match.homeTeamId
      ? match.homeTeamName
      : match.awayTeamName;

  return teamName
    ? `Clasifica ${teamName} por el marcador.`
    : "Clasificado calculado por el marcador.";
}

function updateQualifiedSelect(
  element: HTMLInputElement | HTMLSelectElement,
  match: AdminKnockoutMatch
) {
  const container = element.closest("[data-knockout-match]");

  if (!container) {
    return;
  }

  const homeInput = container.querySelector<HTMLInputElement>(
    '[data-score-field="home"]'
  );
  const awayInput = container.querySelector<HTMLInputElement>(
    '[data-score-field="away"]'
  );
  const select = container.querySelector<HTMLSelectElement>(
    "[data-qualified-select]"
  );
  const hint = container.querySelector<HTMLElement>("[data-qualified-hint]");

  if (!homeInput || !awayInput || !select) {
    return;
  }

  const automaticQualifiedTeamId = getAutomaticQualifiedTeamId(
    match,
    homeInput.value,
    awayInput.value
  );
  const home = parseScore(homeInput.value);
  const away = parseScore(awayInput.value);

  if (automaticQualifiedTeamId) {
    select.value = automaticQualifiedTeamId;
  } else if (home === null || away === null || home !== away) {
    select.value = "";
  }

  if (hint) {
    hint.textContent = getQualifiedHint(match, automaticQualifiedTeamId);
  }
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
