"use client";

import * as React from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * Page scroll position (px) and progress (0 to 1) as motion values, like `useScroll()`. The
 * document's scroll height is cached and only re-read when the page resizes or finishes loading,
 * so a scroll frame costs one `scrollY` read rather than a layout-forcing measurement.
 */
export function usePageScroll(): { scrollY: MotionValue<number>; scrollYProgress: MotionValue<number> } {
  const scrollY = useMotionValue(0);
  const scrollYProgress = useMotionValue(0);

  React.useEffect(() => {
    const root = document.documentElement;
    let range = 1;
    let frame = 0;

    const measure = () => {
      range = Math.max(1, root.scrollHeight - window.innerHeight);
    };
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      scrollY.set(y);
      scrollYProgress.set(Math.min(1, Math.max(0, y / range)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      schedule();
    };

    measure();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollY, scrollYProgress]);

  return { scrollY, scrollYProgress };
}
