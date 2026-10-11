"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True for mouse and trackpad users (not touch-first devices). */
export function useFinePointer() {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/** Fine pointer and no reduced-motion preference: safe for cursor-driven ambient effects. */
export function useAmbientPointer() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  return fine && !reduced;
}
