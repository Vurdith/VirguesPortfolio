"use client";

import * as React from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";

import { MonoIcon } from "@/components/MonoIcon";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

const STEPS = [
  {
    n: "01",
    title: "Reach Out",
    summary:
      "Send the project idea, references, required screens, deadline, and the feeling the UI should carry.",
    detail:
      "We lock scope early: what needs designing, what needs importing, what style direction is right, and what counts as finished.",
  },
  {
    n: "02",
    title: "Design",
    summary:
      "The interface moves from rough structure into polished visuals, with decisions made around readability and game feel.",
    detail:
      "You get clear checkpoints instead of mystery progress: layout direction, visual pass, then final polish before delivery.",
  },
  {
    n: "03",
    title: "Receive",
    summary:
      "Final files are prepared for handoff: clean exports, source where needed, and imports ready for the build pipeline.",
    detail:
      "The goal is a handoff that does not create extra work. Assets are named, grouped, and checked against the agreed scope.",
  },
  {
    n: "04",
    title: "Rating",
    summary:
      "After delivery, a quick review or recommendation helps future clients judge the work from real project experience.",
    detail:
      "Optional, but useful. If something needs a small correction inside the agreed scope, it gets handled before the work is called done.",
  },
] as const;

export function ProcessBlueprint({ className }: { className?: string }) {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const skewX = useTransform(scrollYProgress, [0, 1], [4, -4]);
  const skewY = useTransform(scrollYProgress, [0, 1], [1, -1]);
  const progress = useSpring(useTransform(scrollYProgress, [0.12, 0.82], [0, 1]), {
    stiffness: 120,
    damping: 30,
  });

  return (
    <section
      id="process"
      ref={ref}
      className={cn("relative overflow-hidden border-y border-line/10 py-20 md:py-28", className)}
      aria-label="Process"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <header className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="process" className="size-4" />
              <span>PROCESS</span>
            </div>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl"
            >
              From brief to handoff.
            </motion.h2>
          </div>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-fog/80 md:col-span-7 md:justify-self-end">
            A cleaner version of the original flow: reach out, design, receive, then close the loop.
            Each stage has a visible checkpoint so the project does not drift.
          </p>
        </header>

        <div className="relative mt-12">
          <div aria-hidden="true" className="absolute left-4 top-0 hidden h-full w-px bg-line/10 md:block" />
          <motion.div
            aria-hidden="true"
            className="absolute left-4 top-0 hidden h-full w-px origin-top bg-line/40 md:block"
            style={{ scaleY: progress }}
          />

          <div className="grid gap-4">
            {STEPS.map((step, index) => (
              <ProcessCard key={step.n} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessCard({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const { playHover, playClick } = useUiSounds();
  const cardRef = React.useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const dx = useSpring(useTransform(mouseX, [-260, 260], [-14, 14]), {
    stiffness: 150,
    damping: 22,
  });
  const dy = useSpring(useTransform(mouseY, [-180, 180], [-9, 9]), {
    stiffness: 150,
    damping: 22,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
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
    <motion.article
      ref={cardRef}
      onMouseEnter={playHover}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDragStart={playClick}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.2, 0.85, 0.2, 1] }}
      className="group relative grid cursor-grab gap-5 overflow-hidden border border-line/12 bg-void/30 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-line/30 active:cursor-grabbing md:ml-12 md:grid-cols-[120px_1fr]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-line/30" />
        <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-line/30" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-line/30" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-line/30" />
      </div>

      <div className="relative flex items-start justify-between gap-4 md:block">
        <motion.div style={{ x: dx, y: dy }} className="text-[10px] tracking-[0.3em] text-fog/60">
          {step.n}
        </motion.div>
        <motion.div
          style={{ x: useTransform(dx, (v) => v * -0.35), y: useTransform(dy, (v) => v * -0.35) }}
          className="mt-0 grid size-12 place-items-center border border-line/15 bg-black/35 text-ink/85 md:mt-8"
        >
          <MonoIcon name="process" className="size-5" />
        </motion.div>
      </div>

      <div className="relative">
        <motion.h3
          style={{ x: useTransform(dx, (v) => v * 0.5), y: useTransform(dy, (v) => v * 0.5) }}
          className="font-serif text-3xl leading-none tracking-[-0.05em]"
        >
          {step.title}
        </motion.h3>
        <motion.p
          style={{ x: useTransform(dx, (v) => v * 0.22), y: useTransform(dy, (v) => v * 0.22) }}
          className="mt-5 max-w-3xl text-pretty text-sm leading-relaxed text-fog/86"
        >
          {step.summary}
        </motion.p>
        <motion.p
          style={{ x: useTransform(dx, (v) => v * -0.18), y: useTransform(dy, (v) => v * -0.18) }}
          className="mt-4 max-w-3xl border-l border-line/18 pl-4 text-xs leading-relaxed text-fog/65"
        >
          {step.detail}
        </motion.p>
      </div>
    </motion.article>
  );
}
