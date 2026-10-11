"use client";

import * as React from "react";

/**
 * Marks each home-page section that is far outside the viewport so its looping CSS animations can
 * pause (see `section[data-offscreen]` in globals.css). Animations on screen are untouched and
 * resume the moment a section approaches.
 */
export function AnimationGate() {
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) target.removeAttribute("data-offscreen");
          else target.setAttribute("data-offscreen", "");
        }
      },
      { rootMargin: "300px 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.removeAttribute("data-offscreen"));
    };
  }, []);

  return null;
}
