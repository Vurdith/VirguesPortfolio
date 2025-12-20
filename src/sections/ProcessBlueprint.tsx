"use client";

import * as React from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

const STEPS = [
  {
    n: "01",
    title: "Discovery → constraints → target feeling",
    body: [
      "We define what the interface should do to someone, not just what it should do.",
      "Palette + type + motion rules become a contract before components exist.",
    ],
    tags: ["Identity", "Content", "Interaction"],
  },
  {
    n: "02",
    title: "System design (tokens, rhythm, surfaces)",
    body: [
      "CSS variables drive palette/surfaces; Tailwind only composes — it doesn’t own the design.",
      "Typography scale is deliberate; spacing is architectural (not ‘padding-8 everywhere’).",
    ],
    tags: ["Tailwind", "CSS Vars", "Type Scale"],
  },
  {
    n: "03",
    title: "Build the experience, not the pages",
    body: [
      "App Router layout is the shell; sections are modules; data flows are typed and boring (on purpose).",
      "UI is performance-first: transform-gpu, will-change, minimal paint-heavy filters.",
    ],
    tags: ["Next.js", "TypeScript", "Perf"],
  },
  {
    n: "04",
    title: "Motion pass (cinema rules)",
    body: [
      "Scroll transforms use springs to avoid jitter. Repetition is avoided; motion stays purposeful.",
      "Keyframes (scanlines/marquee) are custom; micro-interactions are tactile + quiet.",
    ],
    tags: ["Framer Motion", "Keyframes", "Micro UX"],
  },
  {
    n: "05",
    title: "Ship + iterate like an engineer",
    body: [
      "Admin tooling is part of the product (CRUD + moderation), not an afterthought.",
      "Dead code gets deleted; every component stays modular and readable.",
    ],
    tags: ["Admin", "DX", "Maintainability"],
  },
] as const;

export function ProcessBlueprint({ className }: { className?: string }) {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const skewX = useTransform(scrollYProgress, [0, 1], [5, -5]);
  const skewY = useTransform(scrollYProgress, [0, 1], [1, -1]);

  return (
    <section
      id="process"
      ref={ref}
      className={cn("relative border-y border-line/10 py-20 md:py-28", className)}
      aria-label="Process"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <p className="text-xs tracking-[0.22em] text-fog/70">PROCESS</p>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl origin-left"
            >
              Blueprint.
            </motion.h2>
            <p className="mt-6 max-w-prose text-pretty text-sm leading-relaxed text-fog/80">
              Not a checklist — a repeatable method for building interfaces that feel like objects:
              weighty, intentional, fast.
            </p>
          </div>

          <div className="md:col-span-7">
            <div className="grid gap-4">
              {STEPS.map((s) => (
                <BlueprintCard key={s.n} step={s} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlueprintCard({ step }: { step: (typeof STEPS)[number] }) {
  const { playHover, playClick } = useUiSounds();
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Motion values for the "exploded" effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 20 };
  const dx = useSpring(useTransform(mouseX, [-200, 200], [-15, 15]), springConfig);
  const dy = useSpring(useTransform(mouseY, [-200, 200], [-10, 10]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileTap={{ scale: 0.98 }}
      onDragStart={playClick}
      onMouseEnter={playHover}
      className={cn(
        "group relative overflow-hidden border border-line/12 bg-void/25 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-line/25 hover:bg-void/40 cursor-grab active:cursor-grabbing",
      )}
    >
      {/* Corner accents */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/25" />
        <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/25" />
        <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/25" />
        <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/25" />
      </div>

      {/* Leader lines (Blueprint style) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <motion.line
          x1="0"
          y1="0"
          x2={dx}
          y2={dy}
          stroke="currentColor"
          className="text-line/20"
          strokeWidth="0.5"
        />
        <motion.line
          x1="100%"
          y1="100%"
          x2={useTransform(dx, v => -v)}
          y2={useTransform(dy, v => -v)}
          stroke="currentColor"
          className="text-line/20"
          strokeWidth="0.5"
          style={{ x: "100%", y: "100%" }}
        />
      </svg>

      <div className="flex items-baseline justify-between gap-6">
        <motion.div 
          style={{ x: dx, y: dy }}
          className="text-[10px] tracking-[0.28em] text-fog/65"
        >
          {step.n}
        </motion.div>
      </div>

      <motion.h3 
        style={{ x: useTransform(dx, v => v * 0.5), y: useTransform(dy, v => v * 0.5) }}
        className="mt-4 font-serif text-2xl leading-[1.02] tracking-[-0.04em]"
      >
        {step.title}
      </motion.h3>

      <motion.div 
        style={{ x: useTransform(dx, v => v * 0.2), y: useTransform(dy, v => v * 0.2) }}
        className="mt-4 space-y-2 text-sm leading-relaxed text-fog/80"
      >
        {step.body.map((line) => (
          <p key={line} className="text-pretty">
            {line}
          </p>
        ))}
      </motion.div>

      <motion.div 
        style={{ x: useTransform(dx, v => -v * 0.3), y: useTransform(dy, v => -v * 0.3) }}
        className="mt-4 flex flex-wrap gap-2"
      >
        {step.tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[10px] tracking-[0.22em] text-fog/70"
          >
            {t.toUpperCase()}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}


