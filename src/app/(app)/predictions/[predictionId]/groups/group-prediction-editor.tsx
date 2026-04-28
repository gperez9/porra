"use client";

import { Save } from "lucide-react";
import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { TeamLabel } from "@/components/team-label";
import {
  saveGroupPredictionAction,
  type GroupPredictionActionState
} from "./actions";

type GroupEditorData = {
  code: string;
  teams: Array<{
    id: string;
    name: string;
    flagCode: string;
  }>;
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
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }> | null;
};

type GroupPredictionEditorProps = {
  predictionId: string;
  group: GroupEditorData;
};

const initialState: GroupPredictionActionState = {
  error: null,
  saved: false
};

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function GroupPredictionEditor({
  predictionId,
  group
}: GroupPredictionEditorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    saveGroupPredictionAction,
    initialState
  );
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const teamById = new Map(group.teams.map((team) => [team.id, team]));
  const initialScoreValues = useMemo(
    () => buildInitialScoreValues(group),
    [group]
  );
  const draftStorageKey = `porra:group-draft:${predictionId}:${group.code}`;
  const scoreInputNames = useMemo(
    () =>
      group.matches.flatMap((match) => [
        `homeGoals:${match.id}`,
        `awayGoals:${match.id}`
      ]),
    [group.matches]
  );

  useBrowserLayoutEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const currentFormValues = collectFormDraftValues(form, scoreInputNames);
    const formAlreadyHasDraft = hasDraftDifference(
      currentFormValues,
      initialScoreValues,
      scoreInputNames
    );

    if (formAlreadyHasDraft) {
      persistDraftValues(draftStorageKey, currentFormValues);
      const frameId = window.requestAnimationFrame(() => {
        setHasDraftChanges(true);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    const draftValues = readDraftValues(draftStorageKey);

    if (!draftValues) {
      return;
    }

    applyDraftValues(form, draftValues, scoreInputNames);
    const frameId = window.requestAnimationFrame(() => {
      setHasDraftChanges(
        hasDraftDifference(draftValues, initialScoreValues, scoreInputNames)
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [draftStorageKey, initialScoreValues, scoreInputNames]);

  useEffect(() => {
    if (state.saved) {
      removeDraftValues(draftStorageKey);
      const frameId = window.requestAnimationFrame(() => {
        setHasDraftChanges(false);
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [draftStorageKey, state.saved]);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const storeCurrentDraft = (updateIndicator: boolean) => {
      const draftValues = collectFormDraftValues(form, scoreInputNames);
      const hasChanges = hasDraftDifference(
        draftValues,
        initialScoreValues,
        scoreInputNames
      );

      if (hasChanges) {
        persistDraftValues(draftStorageKey, draftValues);
      } else {
        removeDraftValues(draftStorageKey);
      }

      if (updateIndicator) {
        setHasDraftChanges(hasChanges);
      }
    };

    const handleFormInput = () => storeCurrentDraft(true);
    const handlePageExit = () => storeCurrentDraft(false);

    form.addEventListener("input", handleFormInput);
    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);

    return () => {
      form.removeEventListener("input", handleFormInput);
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
    };
  }, [draftStorageKey, initialScoreValues, scoreInputNames]);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--accent-strong)]">
            Grupo {group.code}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xl font-bold">
            {group.teams.map((team) => (
              <TeamLabel
                flagCode={team.flagCode}
                key={team.id}
                name={team.name}
              />
            ))}
          </div>
        </div>
        <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">
          {group.standings ? "Completo" : "Borrador"}
        </span>
      </div>

      <form
        action={formAction}
        className="mt-5 grid gap-3"
        data-group-draft-key={draftStorageKey}
        ref={formRef}
      >
        <input name="predictionId" type="hidden" value={predictionId} />

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
              aria-label={`${match.homeTeamName} goles`}
              className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)]"
              data-score-input=""
              defaultValue={initialScoreValues[`homeGoals:${match.id}`] ?? ""}
              inputMode="numeric"
              min={0}
              name={`homeGoals:${match.id}`}
              pattern="[0-9]*"
              suppressHydrationWarning
              type="number"
            />
            <input
              aria-label={`${match.awayTeamName} goles`}
              className="min-h-10 w-full rounded-md border border-[var(--border)] px-2 text-center text-base outline-none focus:border-[var(--accent)]"
              data-score-input=""
              defaultValue={initialScoreValues[`awayGoals:${match.id}`] ?? ""}
              inputMode="numeric"
              min={0}
              name={`awayGoals:${match.id}`}
              pattern="[0-9]*"
              suppressHydrationWarning
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
            Grupo guardado.
          </p>
        ) : null}

        {hasDraftChanges ? (
          <p
            aria-live="polite"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Cambios sin guardar en este grupo. Pulsa Guardar grupo para
            confirmarlos.
          </p>
        ) : null}

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70 sm:justify-self-start"
          disabled={isPending}
          type="submit"
        >
          <Save aria-hidden="true" size={18} />
          {isPending ? "Guardando..." : "Guardar grupo"}
        </button>
      </form>

      {group.standings ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Equipo</th>
                <th className="py-2 pr-3 text-right">PJ</th>
                <th className="py-2 pr-3 text-right">G</th>
                <th className="py-2 pr-3 text-right">E</th>
                <th className="py-2 pr-3 text-right">P</th>
                <th className="py-2 pr-3 text-right">GF</th>
                <th className="py-2 pr-3 text-right">GC</th>
                <th className="py-2 pr-3 text-right">DG</th>
                <th className="py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.standings.map((standing) => (
                <tr
                  className="border-b border-[var(--border)]"
                  key={standing.teamId}
                >
                  <td className="py-2 pr-3 font-semibold">
                    {standing.position}
                  </td>
                  <td className="py-2 pr-3">
                    {teamById.get(standing.teamId) ? (
                      <TeamLabel
                        flagCode={teamById.get(standing.teamId)?.flagCode}
                        name={teamById.get(standing.teamId)?.name}
                      />
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-right">{standing.played}</td>
                  <td className="py-2 pr-3 text-right">{standing.wins}</td>
                  <td className="py-2 pr-3 text-right">{standing.draws}</td>
                  <td className="py-2 pr-3 text-right">{standing.losses}</td>
                  <td className="py-2 pr-3 text-right">{standing.goalsFor}</td>
                  <td className="py-2 pr-3 text-right">
                    {standing.goalsAgainst}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {standing.goalDifference}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {standing.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function buildInitialScoreValues(group: GroupEditorData) {
  return Object.fromEntries(
    group.matches.flatMap((match) => [
      [`homeGoals:${match.id}`, match.homeGoals?.toString() ?? ""],
      [`awayGoals:${match.id}`, match.awayGoals?.toString() ?? ""]
    ])
  );
}

function readDraftValues(storageKey: string): Record<string, string> | null {
  const savedDraft =
    window.sessionStorage.getItem(storageKey) ??
    window.localStorage.getItem(storageKey);

  if (!savedDraft) {
    return null;
  }

  return parseDraftValues(savedDraft);
}

function persistDraftValues(
  storageKey: string,
  draftValues: Record<string, string>
) {
  const serializedDraft = JSON.stringify(draftValues);

  window.sessionStorage.setItem(storageKey, serializedDraft);
  window.localStorage.setItem(storageKey, serializedDraft);
}

function removeDraftValues(storageKey: string) {
  window.sessionStorage.removeItem(storageKey);
  window.localStorage.removeItem(storageKey);
}

function collectFormDraftValues(
  form: HTMLFormElement,
  inputNames: string[]
): Record<string, string> {
  return Object.fromEntries(
    inputNames.map((inputName) => {
      const input = form.elements.namedItem(inputName);

      return [inputName, input instanceof HTMLInputElement ? input.value : ""];
    })
  );
}

function applyDraftValues(
  form: HTMLFormElement,
  draftValues: Record<string, string>,
  inputNames: string[]
) {
  inputNames.forEach((inputName) => {
    const input = form.elements.namedItem(inputName);

    if (input instanceof HTMLInputElement) {
      input.value = draftValues[inputName] ?? "";
    }
  });
}

function hasDraftDifference(
  draftValues: Record<string, string>,
  initialValues: Record<string, string>,
  inputNames: string[]
) {
  return inputNames.some(
    (inputName) => (draftValues[inputName] ?? "") !== initialValues[inputName]
  );
}

function parseDraftValues(value: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return null;
  }
}
