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
  
  const bgBlur = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    ["blur(15px)", "blur(5px)", "blur(5px)", "blur(15px)"]
  );

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
          filter: bgBlur,
          backgroundImage: `url(${SITE.workImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse at center, black 20%, rgba(0,0,0,0.3) 50%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, rgba(0,0,0,0.3) 50%, transparent 85%)",
        }}
      />

      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-void via-transparent to-void" />
        <div className="absolute inset-0 opacity-10 mix-blend-overlay [background:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_2px,transparent_10px)] animate-scanlines" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs tracking-[0.22em] text-fog/70">SELECTED</p>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl origin-left"
            >
              Work.
            </motion.h2>
          </div>

          <p className="max-w-lg text-pretty text-sm leading-relaxed text-fog/80">
            A strict grid, but not a safe one. Hover is a lens: rings, scanlines, a controlled
            blur-field. Click to enter a full-screen screening.
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

  const mask = useMotionTemplate`radial-gradient(180px 180px at ${x}px ${y}px, #000 0%, transparent 62%)`;
  const lensBg = useMotionTemplate`radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 55%, transparent 72%)`;

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
          className="absolute inset-0 blur-[3px] scale-[1.02]"
          style={{ 
            backgroundImage: work.media.src 
              ? `url(${work.media.src}), ${backdrop}, linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0.8) 100%)` 
              : `${backdrop}, linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0.8) 100%)`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />

        {/* Subtle “screen” texture across the whole card. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
            "mix-blend-overlay",
          )}
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)",
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
                ? `url(${work.media.src}), ${backdrop}, linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)` 
                : `${backdrop}`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
        </motion.div>

        {/* Lens hardware: rotating rings + scanlines + soft glare. */}
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
          <motion.div className="absolute inset-0 rounded-full" style={{ backgroundImage: lensBg }} />
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
                className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[10px] tracking-[0.22em] text-fog/70 backdrop-blur-sm"
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


