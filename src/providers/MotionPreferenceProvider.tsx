"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";

type MotionPreference = {
  /** True when the visitor chose to turn animations off with the on-page toggle. */
  reduced: boolean;
  toggle: () => void;
};

const STORAGE_KEY = "ui:reduceMotion";
const MotionPreferenceContext = React.createContext<MotionPreference | null>(null);

export function useMotionPreference() {
  const ctx = React.useContext(MotionPreferenceContext);
  if (!ctx) throw new Error("useMotionPreference must be used within <MotionPreferenceProvider />");
  return ctx;
}

/**
 * Adds a manual "reduce motion" switch on top of the OS setting. When on, framer-motion skips
 * transform animations, CSS animations are disabled through `html[data-motion="reduced"]`, and
 * heavy effects (the hero shader) are not mounted. The OS-level preference is still honoured.
 */
export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setReduced(true);
    } catch {
      // Storage can be blocked; the toggle still works for this visit.
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (reduced) root.dataset.motion = "reduced";
    else delete root.dataset.motion;
  }, [reduced]);

  const toggle = React.useCallback(() => {
    setReduced((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = React.useMemo(() => ({ reduced, toggle }), [reduced, toggle]);

  return (
    <MotionPreferenceContext.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}
