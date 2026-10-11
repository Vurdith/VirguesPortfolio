"use client";

import * as React from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * "enter-exit": 0 when the section's top meets the bottom of the screen, 1 when its bottom leaves
 * the top (framer's offset ["start end", "end start"]).
 * "top-exit": 0 while its top is at the top of the screen, 1 when its bottom has left the top
 * (offset ["start start", "end start"]).
 */
export type SectionProgressMode = "enter-exit" | "top-exit";

/**
 * Scroll progress through one section, as a motion value. Same numbers as `useScroll({ target })`,
 * but only measured while the section is near the screen: outside that range the value is simply
 * 0 or 1, so scrolling doesn't pay for measuring every section on every frame.
 */
export function useSectionProgress(
  ref: React.RefObject<HTMLElement | null>,
  mode: SectionProgressMode = "enter-exit",
): MotionValue<number> {
  const progress = useMotionValue(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const compute = () => {
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const raw = mode === "enter-exit" ? (viewport - rect.top) / (viewport + rect.height) : -rect.top / rect.height;
      return Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0));
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      progress.set(compute());
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    let listening = false;
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
      } else {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
      }
    };

    // Within one screen of the viewport the section is tracked; beyond that it is parked at 0 or 1.
    const observer = new IntersectionObserver(
      ([entry]) => {
        listen(entry.isIntersecting);
        schedule();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);
    progress.set(compute());

    // Content above can shift the page after fonts and images arrive.
    const onLoad = () => schedule();
    window.addEventListener("load", onLoad);

    return () => {
      observer.disconnect();
      listen(false);
      window.removeEventListener("load", onLoad);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, mode, progress]);

  return progress;
}
