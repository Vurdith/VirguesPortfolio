"use client";

import * as React from "react";
import { motion, useScroll, useSpring } from "framer-motion";

import { cn } from "@/lib/cn";
import { useCurrentSection } from "@/hooks/useCurrentSection";
import { useUiSounds } from "@/hooks/useUiSounds";

const SECTIONS = [
  { id: "top", label: "INTRO" },
  { id: "work", label: "WORK" },
  { id: "offerings", label: "SERVICES" },
  { id: "process", label: "PROCESS" },
  { id: "payment", label: "PAYMENT" },
  { id: "reviews", label: "REVIEWS" },
  { id: "contact", label: "CONTACT" },
] as const;

const SECTION_IDS = SECTIONS.map(({ id }) => id);

const pad = (n: number) => String(n).padStart(2, "0");

/** Index of the section currently being read (the intro until something else takes over). */
function useActiveSection() {
  const current = useCurrentSection(SECTION_IDS);
  const index = SECTIONS.findIndex(({ id }) => id === current);
  return index === -1 ? 0 : index;
}

/** Fixed rail on the right edge: section counter, progress line, and jump links. */
export function ScrollProgress() {
  const active = useActiveSection();
  const { playSwell } = useUiSounds();
  const { scrollYProgress } = useScroll();
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.6 });

  // A low swell marks each new section; skip the initial render.
  const previous = React.useRef(active);
  React.useEffect(() => {
    if (previous.current === active) return;
    previous.current = active;
    playSwell();
  }, [active, playSwell]);

  const jumpTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", id === "top" ? window.location.pathname : `#${id}`);
  };

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-none fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex"
    >
      <div className="text-[10px] tabular-nums tracking-[0.28em] text-fog/70">
        <span className="text-ink">{pad(active + 1)}</span>
        <span className="text-fog/40"> / {pad(SECTIONS.length)}</span>
      </div>

      <div className="relative flex flex-col items-end gap-3">
        <div aria-hidden="true" className="absolute right-[3px] top-0 h-full w-px bg-line/12" />
        <motion.div
          aria-hidden="true"
          className="absolute right-[3px] top-0 h-full w-px origin-top bg-line/45"
          style={{ scaleY: lineScale }}
        />

        {SECTIONS.map((section, index) => {
          const isActive = index === active;
          return (
            <a
              key={section.id}
              href={section.id === "top" ? "/" : `/#${section.id}`}
              onClick={(event) => jumpTo(event, section.id)}
              aria-label={section.label}
              aria-current={isActive ? "true" : undefined}
              className="group pointer-events-auto relative flex items-center gap-3 py-0.5"
            >
              <span
                className={cn(
                  "text-[9px] tracking-[0.24em] transition-all duration-300",
                  isActive
                    ? "translate-x-0 text-ink opacity-100"
                    : "translate-x-1 text-fog/70 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                )}
              >
                {section.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative block size-[7px] rounded-full border transition-all duration-300",
                  isActive
                    ? "scale-125 border-ink bg-ink"
                    : "border-line/40 bg-void group-hover:border-ink/80",
                )}
              />
            </a>
          );
        })}
      </div>
    </nav>
  );
}
