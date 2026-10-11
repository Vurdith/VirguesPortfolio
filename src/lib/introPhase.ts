import * as React from "react";

/**
 * Where the intro screen is: the film is playing, the loader is showing, or the site is open.
 * Everything behind the intro is hidden under an opaque panel, so heavy ambient work (the hero
 * shader, looping CSS animations) waits for "done" instead of competing with the film and the
 * Enter button for the main thread.
 */
export type IntroPhase = "video" | "loader" | "done";

let phase: IntroPhase = "video";
const listeners = new Set<() => void>();

export function setIntroPhase(next: IntroPhase) {
  // The attribute is always re-applied: the module starts in "video" without having set it.
  if (typeof document !== "undefined") {
    if (next === "done") document.documentElement.removeAttribute("data-intro");
    else document.documentElement.setAttribute("data-intro", next);
  }
  if (phase === next) return;
  phase = next;
  listeners.forEach((listener) => listener());
}

export function getIntroPhase() {
  return phase;
}

export function subscribeIntroPhase(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIntroPhase(): IntroPhase {
  // The server and the first client render agree on "video"; pages without an intro flip to "done".
  return React.useSyncExternalStore(subscribeIntroPhase, getIntroPhase, () => "video");
}
