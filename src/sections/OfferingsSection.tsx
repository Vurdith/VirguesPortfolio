"use client";

import * as React from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { MonoIcon } from "@/components/MonoIcon";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

const TASK_DISCOUNTS = [
  { label: "5 tasks", off: "5% off" },
  { label: "10 tasks", off: "10% off" },
  { label: "20 tasks", off: "15% off" },
  { label: "40 tasks", off: "25% off" },
] as const;

const OFFERINGS = [
  {
    code: "01",
    title: "UI/UX Design",
    description:
      "Custom interface screens shaped around your game's style, from rough layout to polished visual design.",
    why: "Best for menus, shops, HUDs, dashboards, and systems that need to feel finished instead of patched together.",
    badge: "From £50 / task",
    discounts: TASK_DISCOUNTS,
  },
  {
    code: "02",
    title: "Roblox Importing",
    description:
      "Clean Roblox imports with sizing checks, greyscale support, and careful translation from source files into Studio.",
    why: "Good for getting assets in-game cleanly the first time, with fewer alignment and fidelity issues.",
    badge: "From £30 / task",
    discounts: TASK_DISCOUNTS,
  },
  {
    code: "03",
    title: "Priority Queue",
    description:
      "Expedited delivery for launch windows, reveal dates, or projects that need to move without waiting behind the normal queue.",
    why: "Best when timing matters and the work needs front-of-line attention without dropping quality.",
    badge: "Rush slot · £150",
  },
  {
    code: "04",
    title: "Yearly Subscription",
    description:
      "Ongoing support for active projects, with priority queue access, recurring imports, seasonal UI updates, and cleaner long-term direction.",
    why: "Strong value for studios that need regular updates, predictable cost, and one visual standard across the year.",
    badge: "From £1650 / yr",
  },
  {
    code: "05",
    title: "Branding & Art Direction",
    description:
      "Typography, spacing rules, component direction, and visual standards that keep UI and promo assets consistent.",
    why: "Keeps the project recognisable everywhere instead of looking like separate assets stitched together.",
    badge: "From £50",
  },
  {
    code: "06",
    title: "QA & Polish",
    description:
      "A final pass for spacing, alignment, hierarchy, and screenshot-readiness before the work goes public.",
    why: "Great for trailers, launches, or reveals where small visual mistakes become very visible.",
    badge: "From £75",
  },
] as const;

const PERKS = [
  "Free discovery chat",
  "Quote before work starts",
  "Any style direction",
  "Consistent design tokens",
  "Exports plus source on request",
  "Performance-minded animations",
  "Minor tweaks after delivery",
] as const;

export function OfferingsSection({ className }: { className?: string }) {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const skewX = useTransform(scrollYProgress, [0, 1], [-4, 4]);
  const skewY = useTransform(scrollYProgress, [0, 1], [-1, 1]);
  const lineScale = useSpring(useTransform(scrollYProgress, [0.12, 0.8], [0, 1]), {
    stiffness: 120,
    damping: 28,
  });

  return (
    <section
      id="offerings"
      ref={ref}
      className={cn("relative overflow-hidden border-y border-line/10 py-20 md:py-28", className)}
      aria-label="Services"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-full w-px origin-top bg-line/15"
        style={{ scaleY: lineScale }}
      />

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <header className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="services" className="size-4" />
              <span>SERVICES</span>
            </div>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl"
            >
              Services.
            </motion.h2>
          </div>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-fog/80 md:col-span-7 md:justify-self-end">
            Practical services for Roblox projects and interface-heavy launches. Prices start simple,
            then scale with screen count, asset count, deadline, and how much polish the project needs.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          {OFFERINGS.map((offering, index) => (
            <OfferingCard
              key={offering.title}
              offering={offering}
              spanClass={OFFERING_SPANS[index]}
            />
          ))}
        </div>

        <div className="mt-4">
          <SupportPanel title="Included" eyebrow="Every Quote">
            <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {PERKS.map((perk) => (
                <div key={perk} className="flex items-center gap-3 text-xs leading-relaxed text-fog/72">
                  <span aria-hidden="true" className="h-px w-5 shrink-0 bg-line/25" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </SupportPanel>
        </div>
      </div>
    </section>
  );
}

function SupportPanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="perf-card relative overflow-hidden border border-line/12 bg-void/30 p-5 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-line/25" />
        <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-line/25" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-line/25" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-line/25" />
      </div>
      <div className="relative">
        <p className="text-[10px] tracking-[0.28em] text-fog/55">{eyebrow.toUpperCase()}</p>
        <h3 className="mt-2 font-serif text-2xl leading-none tracking-[-0.04em]">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function OfferingCard({
  offering,
  spanClass,
}: {
  offering: (typeof OFFERINGS)[number];
  spanClass: string;
}) {
  const { playHover } = useUiSounds();

  return (
    <motion.article
      layout
      onMouseEnter={playHover}
      transition={{ layout: { duration: 0.24, ease: "easeOut" } }}
      className={cn(
        "perf-card group relative h-full min-h-[250px] overflow-hidden border border-line/12 bg-void/35 p-5 backdrop-blur-sm",
        "transition-colors duration-300 hover:border-line/30",
        "md:col-span-1",
        spanClass
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-line/35" />
        <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-line/35" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-line/35" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-line/35" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-px bg-line/35" />
        <div className="absolute -right-16 -top-16 size-48 rounded-full border border-line/10" />
      </div>

      <div className="relative flex h-full min-h-[210px] flex-col">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] tracking-[0.28em] text-fog/60">{offering.code}</p>
            <h3 className="mt-4 font-serif text-2xl leading-none tracking-[-0.04em]">
              {offering.title}
            </h3>
          </div>
          <div className="grid size-10 shrink-0 place-items-center border border-line/12 bg-black/25 text-fog/70">
            <MonoIcon name="services" className="size-4" />
          </div>
        </div>

        <p className="mt-6 min-h-[4.6rem] text-sm leading-relaxed text-fog/82">
          {offering.description}
        </p>
        <p className="mt-4 border-l border-line/16 pl-4 text-xs leading-relaxed text-fog/62">
          {offering.why}
        </p>

        {"discounts" in offering && (
          <details
            className="group/task mt-5 border border-line/10 bg-white/[0.025] text-xs text-fog/68 [&>summary::-webkit-details-marker]:hidden"
            onMouseEnter={playHover}
          >
            <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-4 px-3 py-3 text-[10px] tracking-[0.2em] text-fog/75 transition-colors duration-200 hover:bg-white/[0.025]">
              <span>SAVE ON 5+ TASKS</span>
              <span className="flex items-center gap-3 text-ink/75">
                <span className="hidden h-px w-8 bg-line/16 sm:block" />
                <span
                  aria-hidden="true"
                  className="relative block size-5 border border-line/12 transition-transform duration-200 group-open/task:rotate-45"
                >
                  <span className="absolute left-1/2 top-1/2 h-px w-2 -translate-x-1/2 -translate-y-1/2 bg-ink/75" />
                  <span className="absolute left-1/2 top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-ink/75" />
                </span>
              </span>
            </summary>
            <p className="min-h-[3rem] border-t border-line/8 px-3 pt-3 text-[11px] leading-relaxed tracking-normal text-fog/58">
              More tasks in one quote lower the total, so bigger UI sets and import batches become
              better value.
            </p>
            <div className="grid gap-2 px-3 pb-3 pt-3">
              {offering.discounts.map((discount) => (
                <div
                  key={discount.label}
                  className="grid grid-cols-[1fr_auto] border-t border-line/8 pt-2 text-[10px] tracking-[0.16em]"
                >
                  <span>{discount.label.toUpperCase()}</span>
                  <span className="text-ink/78">{discount.off.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="mt-auto pt-6">
          <span className="inline-flex max-w-full items-center border border-line/15 bg-white/[0.035] px-3 py-2 text-[10px] tracking-[0.2em] text-fog/75">
            {offering.badge.toUpperCase()}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

const OFFERING_SPANS = [
  "lg:col-span-7",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-7",
  "lg:col-span-6",
  "lg:col-span-6",
] as const;
