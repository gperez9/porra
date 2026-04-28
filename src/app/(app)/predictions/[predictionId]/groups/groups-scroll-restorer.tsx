"use client";

import { useEffect, useLayoutEffect } from "react";

type GroupsScrollRestorerProps = {
  predictionId: string;
};

export function GroupsScrollRestorer({
  predictionId
}: GroupsScrollRestorerProps) {
  useBrowserLayoutEffect(() => {
    const storageKey = `porra:groups-scroll:${predictionId}`;
    const previousScrollRestoration = window.history.scrollRestoration;
    const savedScrollY = Number(
      window.sessionStorage.getItem(storageKey) ??
        window.localStorage.getItem(storageKey)
    );

    window.history.scrollRestoration = "manual";

    if (Number.isFinite(savedScrollY) && savedScrollY > 0) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY });
      });
    }

    let frameId: number | null = null;
    const persistScroll = () => {
      window.sessionStorage.setItem(storageKey, String(window.scrollY));
      window.localStorage.setItem(storageKey, String(window.scrollY));
    };

    const saveScroll = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        persistScroll();
        frameId = null;
      });
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("beforeunload", persistScroll);
    window.addEventListener("pagehide", persistScroll);

    return () => {
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("beforeunload", persistScroll);
      window.removeEventListener("pagehide", persistScroll);
      window.history.scrollRestoration = previousScrollRestoration;

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [predictionId]);

  return null;
}

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
