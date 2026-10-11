"use client";

import * as React from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its children in, once, as they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(delay, 0.5) }}
    >
      {children}
    </Tag>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
    >
      <div>
        <p className="text-xs tracking-[0.22em] text-fog/70">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">{title}</h1>
      </div>
      {children}
    </motion.div>
  );
}

/** A framed panel in the portfolio's corner-bracket style. */
export function AdminCard({
  children,
  className,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-line/12 bg-void/40",
        interactive &&
          "transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line/30 hover:bg-white/[0.03]",
        className,
      )}
    >
      <CornerMarks size={4} tone="border-line/30" className="opacity-60" />
      {children}
    </div>
  );
}

/** Counts up to `value` the first time it is visible. */
export function CountNumber({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(value);

  React.useEffect(() => {
    if (!inView || reduce || value === 0) return;
    setShown(0);
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

export const adminButton =
  "inline-flex h-9 items-center justify-center gap-2 border border-line/15 bg-void/40 px-4 text-[11px] tracking-[0.22em] text-fog/80 transition-[border-color,color,background-color,transform] duration-200 hover:border-line/35 hover:text-ink active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50";

export const adminInput =
  "w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/40 focus:border-line/40";
