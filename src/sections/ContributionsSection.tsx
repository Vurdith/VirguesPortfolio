"use client";

import * as React from "react";
import Image from "next/image";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { usePointerTracking } from "@/hooks/usePointerTracking";
import { cn } from "@/lib/cn";
import type { Contribution } from "@/lib/contributions";

const EASE = [0.2, 0.85, 0.2, 1] as const;

/** 1,156,220,228 → "1.16B", 55,145,211 → "55.1M", 408 → "408". */
function compact(value: number) {
  const units = [
    { size: 1e9, suffix: "B" },
    { size: 1e6, suffix: "M" },
    { size: 1e3, suffix: "K" },
  ];
  for (const { size, suffix } of units) {
    if (value >= size) {
      const scaled = value / size;
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return `${scaled.toFixed(digits).replace(/\.?0+$/, "")}${suffix}`;
    }
  }
  return String(Math.round(value));
}

/** Counts up from zero the first time it scrolls into view; the server renders the real value. */
function CountUp({ value, className }: { value: number | null; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = React.useState(value);

  React.useLayoutEffect(() => {
    if (value !== null && !reduceMotion) setShown(0);
  }, [value, reduceMotion]);

  React.useEffect(() => {
    if (!inView || value === null || reduceMotion) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: EASE,
      onUpdate: (latest) => setShown(latest),
    });
    return () => controls.stop();
  }, [inView, value, reduceMotion]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {shown === null ? "—" : compact(shown)}
    </span>
  );
}

export function ContributionsSection({
  items,
  className,
}: {
  items: Contribution[];
  className?: string;
}) {
  const known = items.filter((item) => item.visits !== null);
  const totalVisits = known.length ? known.reduce((sum, item) => sum + (item.visits ?? 0), 0) : null;
  // Peaks are entered by hand (Roblox doesn't publish them). Until some are set, fall back to
  // the live player count so the section never shows an empty stat.
  const peaks = items.flatMap((item) => (item.peak !== null ? [item.peak] : []));
  const highestPeak = peaks.length ? Math.max(...peaks) : null;
  const livePlayers = items.some((item) => item.playing !== null)
    ? items.reduce((sum, item) => sum + (item.playing ?? 0), 0)
    : null;

  return (
    <section
      id="contributions"
      className={cn("relative overflow-hidden border-t border-line/10 py-20 md:py-28", className)}
      aria-label="Contributions"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <header className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="trophy" className="size-4" />
              <span>TROPHY CASE</span>
            </div>
            <RevealHeading className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
              Contributions.
            </RevealHeading>
          </div>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-fog/80 md:col-span-7 md:justify-self-end">
            Roblox games I’ve helped build. Visits are pulled live from Roblox, so the numbers keep
            moving.
          </p>
        </header>

        <dl className="mt-10 grid grid-cols-3 border border-line/12 bg-void/30">
          <Total label="GAMES">
            <CountUp value={items.length} />
          </Total>
          <Total label="TOTAL VISITS" divided>
            <CountUp value={totalVisits} />
          </Total>
          {highestPeak !== null ? (
            <Total label="HIGHEST PEAK" divided>
              <CountUp value={highestPeak} />
            </Total>
          ) : (
            <Total label="PLAYING NOW" divided>
              <CountUp value={livePlayers} />
            </Total>
          )}
        </dl>

        <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {items.map((item, index) => (
            <motion.li
              key={item.placeId}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.7, ease: EASE, delay: (index % 3) * 0.08 }}
              className={cn(
                index < 2 ? "lg:col-span-3" : "lg:col-span-2",
                // Keep the two-column layout tidy when the last card would sit alone.
                index === items.length - 1 && items.length % 2 === 1 && "md:col-span-2 lg:col-span-2",
              )}
            >
              <TrophyCard item={item} rank={index + 1} large={index < 2} />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Total({
  label,
  divided,
  children,
}: {
  label: string;
  divided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative px-4 py-5 md:px-8 md:py-7", divided && "border-l border-line/12")}>
      <dt className="text-[11px] tracking-[0.22em] text-fog/70">{label}</dt>
      <dd className="mt-3 font-serif text-3xl leading-none tracking-[-0.05em] md:text-6xl">{children}</dd>
    </div>
  );
}

function TrophyCard({
  item,
  rank,
  large,
}: {
  item: Contribution;
  rank: number;
  large: boolean;
}) {
  const ref = React.useRef<HTMLElement>(null);

  // Tilt and a foil-like glare that follow the pointer; written straight to CSS variables so
  // moving the mouse never re-renders React.
  const pointer = usePointerTracking<HTMLElement>({
    onFrame: ({ x, y }, { width, height }) => {
      const element = ref.current;
      if (!element) return;
      const px = x / width;
      const py = y / height;
      element.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      element.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      element.style.setProperty("--rx", `${((0.5 - py) * 7).toFixed(2)}deg`);
      element.style.setProperty("--ry", `${((px - 0.5) * 9).toFixed(2)}deg`);
    },
    onLeave: () => {
      const element = ref.current;
      if (!element) return;
      element.style.setProperty("--rx", "0deg");
      element.style.setProperty("--ry", "0deg");
    },
  });

  const canTilt = (event: React.PointerEvent<HTMLElement>) =>
    event.pointerType === "mouse" && document.documentElement.dataset.motion !== "reduced";

  const stats = [
    { label: "VISITS", value: item.visits },
    item.peak !== null
      ? { label: "PEAK PLAYERS", value: item.peak }
      : { label: "PLAYING", value: item.playing },
    { label: "FAVOURITES", value: item.favorites },
  ];

  return (
    <article
      ref={ref}
      onPointerEnter={(event) => canTilt(event) && pointer.onPointerEnter(event)}
      onPointerMove={(event) => canTilt(event) && pointer.onPointerMove(event)}
      onPointerLeave={pointer.onPointerLeave}
      className={cn(
        "trophy-card group relative h-full overflow-hidden border border-line/14 bg-void/50",
        "transition-[border-color,box-shadow,transform] duration-500 ease-out hover:border-line/40",
        "hover:shadow-[0_30px_80px_-30px_rgba(255,255,255,0.18)]",
      )}
    >
      <CornerMarks size={4} tone="border-line/40" className="z-20 opacity-80" />

      <div className={cn("relative overflow-hidden bg-black", large ? "aspect-[16/8]" : "aspect-[16/9]")}>
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover grayscale-[35%] transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.07] group-hover:grayscale-0"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)] font-serif text-7xl text-fog/30"
          >
            {item.name.slice(0, 1)}
          </div>
        )}

        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
        <div aria-hidden="true" className="scanlines opacity-0 transition-opacity duration-500 group-hover:opacity-60" />
        <div aria-hidden="true" className="trophy-glare absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute inset-x-0 top-0 p-4">
          <span className="inline-block border border-line/35 bg-black/60 px-2 py-1 text-[11px] tabular-nums tracking-[0.22em] text-ink">
            Nº {String(rank).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="relative p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className={cn("font-serif leading-none tracking-[-0.04em]", large ? "text-3xl" : "text-2xl")}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="outline-none after:absolute after:inset-0 after:z-30 focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-ink/85"
            >
              {item.name}
              <span className="sr-only"> on Roblox (opens in a new tab)</span>
            </a>
          </h3>
          {item.year ? (
            <span className="shrink-0 text-[11px] tracking-[0.22em] text-fog/70">SINCE {item.year}</span>
          ) : null}
        </div>

        <dl className={cn("mt-6 grid gap-px border border-line/12 bg-line/12", "grid-cols-3")}>
          {stats.map((stat) => (
            <div key={stat.label} className="bg-void/80 px-3 py-3">
              <dt className="text-[10px] tracking-[0.2em] text-fog/70">{stat.label}</dt>
              <dd className="mt-1.5 font-serif text-xl leading-none tracking-[-0.03em] md:text-2xl">
                <CountUp value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-center justify-between text-[11px] tracking-[0.22em] text-fog/70 transition-colors group-hover:text-ink">
          <span>VIEW ON ROBLOX</span>
          <span aria-hidden="true" className="flex items-center gap-2">
            <span className="h-px w-8 bg-line/30 transition-[width,background-color] duration-500 group-hover:w-16 group-hover:bg-ink" />
            <span className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
          </span>
        </div>
      </div>
    </article>
  );
}
