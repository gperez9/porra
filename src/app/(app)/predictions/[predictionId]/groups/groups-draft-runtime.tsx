type GroupsDraftRuntimeProps = {
  predictionId: string;
};

export function GroupsDraftRuntime({ predictionId }: GroupsDraftRuntimeProps) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: buildGroupsDraftRuntimeScript(predictionId)
      }}
    />
  );
}

function buildGroupsDraftRuntimeScript(predictionId: string) {
  return `
(() => {
  if (window.__porraGroupsDraftRuntime?.setPredictionId) {
    window.__porraGroupsDraftRuntime.setPredictionId(${JSON.stringify(predictionId)});
    return;
  }

  let activePredictionId = ${JSON.stringify(predictionId)};
  const formSelector = "form[data-group-draft-key]";
  const inputSelector = "input[data-score-input]";
  let scrollFrameId = 0;
  window.__porraGroupsDraftRuntime = {
    setPredictionId(nextPredictionId) {
      activePredictionId = nextPredictionId;
      applyDrafts();
      restoreScroll();
    }
  };

  const readStoredValue = (storageKey) => {
    try {
      return window.sessionStorage.getItem(storageKey) || window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const writeStoredValue = (storageKey, value) => {
    try {
      window.sessionStorage.setItem(storageKey, value);
      window.localStorage.setItem(storageKey, value);
    } catch {}
  };

  const parseDraft = (rawDraft) => {
    if (!rawDraft) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawDraft);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const collectDraft = (form) => {
    const values = {};

    form.querySelectorAll(inputSelector).forEach((input) => {
      if (input instanceof HTMLInputElement && input.name) {
        values[input.name] = input.value;
      }
    });

    return values;
  };

  const persistDraft = (form) => {
    const storageKey = form.getAttribute("data-group-draft-key");

    if (!storageKey) {
      return;
    }

    writeStoredValue(storageKey, JSON.stringify(collectDraft(form)));
  };

  const applyDraft = (form) => {
    const storageKey = form.getAttribute("data-group-draft-key");
    const draft = storageKey ? parseDraft(readStoredValue(storageKey)) : null;

    if (!draft) {
      return;
    }

    form.querySelectorAll(inputSelector).forEach((input) => {
      if (
        input instanceof HTMLInputElement &&
        input.name &&
        typeof draft[input.name] === "string"
      ) {
        input.value = draft[input.name];
      }
    });

    form.dataset.localDraftRestored = "true";
  };

  const applyDrafts = () => {
    document.querySelectorAll(formSelector).forEach(applyDraft);
  };

  const handleDraftInput = (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.matches(inputSelector)) {
      return;
    }

    const form = target.closest(formSelector);

    if (form instanceof HTMLFormElement) {
      form.dataset.localDraftDirty = "true";
      persistDraft(form);
    }
  };

  const persistDirtyDrafts = () => {
    document.querySelectorAll(formSelector).forEach((form) => {
      if (form instanceof HTMLFormElement && form.dataset.localDraftDirty === "true") {
        persistDraft(form);
      }
    });
  };

  const persistScroll = () => {
    writeStoredValue("porra:groups-scroll:" + activePredictionId, String(window.scrollY));
  };

  const scheduleScrollPersist = () => {
    if (scrollFrameId) {
      return;
    }

    scrollFrameId = window.requestAnimationFrame(() => {
      scrollFrameId = 0;
      persistScroll();
    });
  };

  const restoreScroll = () => {
    const savedScrollY = Number(readStoredValue("porra:groups-scroll:" + activePredictionId));

    if (!Number.isFinite(savedScrollY) || savedScrollY <= 0) {
      return;
    }

    const scrollToSavedPosition = () => window.scrollTo({ top: savedScrollY });
    window.requestAnimationFrame(scrollToSavedPosition);
    window.setTimeout(scrollToSavedPosition, 100);
    window.setTimeout(scrollToSavedPosition, 350);
  };

  document.addEventListener("input", handleDraftInput, true);
  document.addEventListener("change", handleDraftInput, true);
  window.addEventListener("scroll", scheduleScrollPersist, { passive: true });
  window.addEventListener("beforeunload", () => {
    persistDirtyDrafts();
    persistScroll();
  });
  window.addEventListener("pagehide", () => {
    persistDirtyDrafts();
    persistScroll();
  });
  window.addEventListener("pageshow", () => {
    applyDrafts();
    restoreScroll();
  });

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        applyDrafts();
        restoreScroll();
      },
      { once: true }
    );
  } else {
    applyDrafts();
    restoreScroll();
  }
})();
`;
}
