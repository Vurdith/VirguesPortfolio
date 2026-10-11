"use client";

import * as React from "react";

/** How far down the viewport the "reading line" sits, as a fraction of its height. */
const READING_LINE = 0.35;

/**
 * The id (from `ids`) of the section crossing a reading line a third of the way down the
 * screen, or null when none does. Using a line near the top rather than the exact middle means a
 * short section that was just scrolled to still counts as current instead of the one after it.
 */
export function useCurrentSection(ids: readonly string[]) {
  const [current, setCurrent] = React.useState<string | null>(null);
  const key = ids.join("|");

  React.useEffect(() => {
    const list = key.split("|");
    let frame = 0;

    const measure = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      let found: string | null = null;
      for (const id of list) {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        if (rect && rect.top <= line && rect.bottom > line) found = id;
      }
      setCurrent(found);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return current;
}
