"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

import type { Work } from "@/types/portfolio";
import { MonoIcon } from "@/components/MonoIcon";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

const BACKDROPS = [
  "radial-gradient(900px 700px at 20% 10%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(700px 600px at 80% 30%, rgba(255,255,255,0.07), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
  "radial-gradient(900px 700px at 85% 18%, rgba(255,255,255,0.11), transparent 60%), radial-gradient(800px 600px at 25% 70%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 45%), linear-gradient(45deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
  "radial-gradient(900px 700px at 35% 20%, rgba(255,255,255,0.10), transparent 62%), radial-gradient(800px 600px at 78% 80%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 45%), linear-gradient(225deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
  "radial-gradient(900px 700px at 70% 12%, rgba(255,255,255,0.12), transparent 62%), radial-gradient(800px 600px at 20% 85%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 45%), linear-gradient(315deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
] as const;

import { SITE } from "@/lib/site";

// ... constants ...

export function WorkGallery({
  works,
  className,
}: {
  works: Work[];
  className?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const skewX = useTransform(scrollYProgress, [0, 1], [5, -5]);
  const skewY = useTransform(scrollYProgress, [0, 1], [1, -1]);

  const bgY = useSpring(useTransform(scrollYProgress, [0, 1], [-100, 100]), {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });
  
  const bgScale = useSpring(useTransform(scrollYProgress, [0, 1], [1.1, 1.25]), {
    stiffness: 100,
    damping: 30,
  });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 0.6, 0.6, 0]);
  
  return (
    <section
      id="work"
      ref={ref}
      className={cn("relative py-20 md:py-28 overflow-hidden", className)}
      aria-label="Work"
    >
      {/* Cinematic Background Integration */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none transform-gpu will-change-transform"
        style={{
          y: bgY,
          scale: bgScale,
          opacity: bgOpacity,
          backgroundImage: `url(${SITE.workImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse at center, black 20%, rgba(0,0,0,0.3) 50%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, rgba(0,0,0,0.3) 50%, transparent 85%)",
        }}
      />

      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-void via-transparent to-void" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="work" className="size-4" />
              <span>SELECTED</span>
            </div>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl origin-left"
            >
              Work.
            </motion.h2>
          </div>

          <p className="max-w-lg text-pretty text-sm leading-relaxed text-fog/80">
            A strict grid, but not a safe one. Hover is a lens: rings, scanlines, and a controlled
            reveal field. Click to enter a full-screen screening.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work, idx) => (
            <WorkCard key={work.id} work={work} backdrop={BACKDROPS[idx % BACKDROPS.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkCard({ work, backdrop }: { work: Work; backdrop: string }) {
  const { playHover, playClick } = useUiSounds();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useMotionValue(0);
  const rY = useMotionValue(0);
  const hover = useMotionValue(0);

  const x = useSpring(mx, { stiffness: 520, damping: 44, mass: 0.6 });
  const y = useSpring(my, { stiffness: 520, damping: 44, mass: 0.6 });
  const rotX = useSpring(rX, { stiffness: 520, damping: 44, mass: 0.6 });
  const rotY = useSpring(rY, { stiffness: 520, damping: 44, mass: 0.6 });
  const o = useSpring(hover, { stiffness: 520, damping: 44, mass: 0.6 });

  const mask = useMotionTemplate`radial-gradient(180px 180px at ${x}px ${y}px, #000 0%, #000 58%, transparent 76%)`;
  const tiltShadow = useTransform(o, [0, 1], ["0px", "4px"]);
  const shadow = useMotionTemplate`0 ${tiltShadow} 12px rgba(0,0,0,0.8)`;

  const onEnter = React.useCallback(() => {
    hover.set(1);
  }, [hover]);

  const onLeave = React.useCallback(() => {
    hover.set(0);
    rX.set(0);
    rY.set(0);
  }, [hover, rX, rY]);

  const onMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      mx.set(px);
      my.set(py);

      const dx = (px - rect.width / 2) / (rect.width / 2);
      const dy = (py - rect.height / 2) / (rect.height / 2);
      rY.set(dx * 15);
      rX.set(-dy * 15);
    },
    [mx, my, rX, rY],
  );

  return (
    <Link
      href={`/work/${work.slug}`}
      className="group block"
      onMouseEnter={playHover}
      onClick={playClick}
      aria-label={`Open ${work.title}`}
    >
      <motion.div
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerMove={onMove}
        style={{
          rotateX: rotX,
          rotateY: rotY,
          boxShadow: shadow,
          transformPerspective: 800,
        }}
        className={cn(
          "relative aspect-[4/5] overflow-hidden border border-white/5 bg-void/40",
          "transform-gpu will-change-transform [transform-style:preserve-3d]",
        )}
      >
        <div
          className="absolute inset-0 scale-[1.025] blur-[2px]"
          style={{ 
            backgroundImage: work.media.src 
              ? `linear-gradient(180deg, rgb(0 0 0 / 0.10), rgb(0 0 0 / 0.78)), url(${work.media.src}), ${backdrop}` 
              : `${backdrop}, linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0.8) 100%)`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />

        {/* Sharp-field revealed only under the moving lens (mask). */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            opacity: o,
            WebkitMaskImage: mask as unknown as string,
            maskImage: mask as unknown as string,
          }}
        >
          <div
            className="absolute inset-0 scale-[1.01]"
            style={{ 
              backgroundImage: work.media.src 
                ? `url(${work.media.src})` 
                : `${backdrop}`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-75 mix-blend-overlay animate-scanlines"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 2px, transparent 7px)",
            }}
          />
        </motion.div>

        {/* Lens hardware: rotating rings + soft glare. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 size-64"
          style={{ 
            x: useMotionTemplate`${x}px`, 
            y: useMotionTemplate`${y}px`, 
            translateX: "-50%", 
            translateY: "-50%",
            opacity: o 
          }}
        >
          <div className="absolute inset-0 rounded-full border border-line/30 animate-ring" />
          <div className="absolute inset-[18px] rounded-full border border-line/20 [border-style:dashed] animate-ring [animation-duration:3.6s]" />
          <div
            className="absolute inset-[30px] rounded-full opacity-55 mix-blend-overlay animate-scanlines"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 2px, transparent 7px)",
            }}
          />
          <div className="absolute inset-0 rounded-full bg-white/[0.06]" />
        </motion.div>

        {/* Bottom metadata (kept inside the strict card). */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-serif text-xl leading-none tracking-[-0.03em]">{work.title}</h3>
            <div className="text-[10px] tracking-[0.22em] text-fog/70">{work.year ?? "—"}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {work.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center border border-line/12 bg-void/70 px-2 py-1 text-[10px] tracking-[0.22em] text-fog/70"
              >
                {t.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}


