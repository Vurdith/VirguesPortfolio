"use client";

import * as React from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

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
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end"
    >
      <div className="min-w-0">
        <h1 className="font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-fog/70">{description}</p> : null}
      </div>
      {children}
    </motion.div>
  );
}

/** A frosted panel. Interactive ones rise and glow under the pointer. */
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
        "relative overflow-hidden rounded-2xl border border-line/10 bg-white/[0.025] backdrop-blur-sm",
        interactive &&
          "transition-[border-color,background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-line/25 hover:bg-white/[0.045] hover:shadow-[0_18px_50px_-24px_rgb(255_255_255/0.18)]",
        className,
      )}
    >
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
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line/15 bg-white/[0.03] px-5 text-[11px] tracking-[0.2em] text-fog/85 transition-[border-color,color,background-color,transform] duration-200 hover:border-line/35 hover:bg-white/[0.07] hover:text-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

/** The main action on a page: a solid light pill. */
export const adminButtonSolid =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[11px] tracking-[0.2em] text-void transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export const adminInput =
  "w-full rounded-xl border border-line/10 bg-white/[0.03] px-3.5 py-3 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-fog/40 focus:border-line/40 focus:shadow-[0_0_0_4px_rgb(255_255_255/0.05)]";
