"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";

type MotionPreference = {
  /** True when the visitor's operating system asks for reduced motion. */
  reduced: boolean;
};

const MotionPreferenceContext = React.createContext<MotionPreference | null>(null);

export function useMotionPreference() {
  const ctx = React.useContext(MotionPreferenceContext);
  if (!ctx) throw new Error("useMotionPreference must be used within <MotionPreferenceProvider />");
  return ctx;
}

function MotionPreferenceState({ children }: { children: React.ReactNode }) {
  // Starts false so the first client render matches the server HTML, then follows the OS.
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const value = React.useMemo(() => ({ reduced }), [reduced]);
  return <MotionPreferenceContext.Provider value={value}>{children}</MotionPreferenceContext.Provider>;
}

/** Animations follow the operating system's "reduce motion" setting. */
export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <MotionPreferenceState>{children}</MotionPreferenceState>
    </MotionConfig>
  );
}
