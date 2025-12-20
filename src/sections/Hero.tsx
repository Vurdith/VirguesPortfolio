"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";
import { useUiSounds } from "@/hooks/useUiSounds";

export function Hero({ className }: { className?: string }) {
  const { playHover, playClick } = useUiSounds();

  const ref = React.useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const bgY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 160]), {
    stiffness: 120,
    damping: 30,
    mass: 0.6,
  });
  const bgScale = useSpring(useTransform(scrollYProgress, [0, 1], [1.08, 1.18]), {
    stiffness: 120,
    damping: 30,
    mass: 0.6,
  });

  const bgBlur = useSpring(useTransform(scrollYProgress, [0, 0.8], ["blur(0px)", "blur(20px)"]), {
    stiffness: 120,
    damping: 30,
  });

  const bgOpacity = useSpring(useTransform(scrollYProgress, [0, 0.7], [0.85, 0]), {
    stiffness: 120,
    damping: 30,
  });

  const titleY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 48]), {
    stiffness: 140,
    damping: 32,
    mass: 0.6,
  });
  const fade = useSpring(useTransform(scrollYProgress, [0, 0.55], [1, 0]), {
    stiffness: 160,
    damping: 34,
    mass: 0.7,
  });

  const skewX = useTransform(scrollYProgress, [0, 0.5], [0, -15]);
  const skewY = useTransform(scrollYProgress, [0, 0.5], [0, 2]);
  const translateX = useTransform(scrollYProgress, [0, 0.5], [0, 40]);

  return (
    <section
      ref={ref}
      className={cn("relative min-h-[100svh] overflow-hidden border-b border-line/10", className)}
      aria-label="Hero"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 transform-gpu will-change-transform"
        style={{
          y: bgY,
          scale: bgScale,
          filter: bgBlur,
          opacity: bgOpacity,
          backgroundImage: `url(${SITE.heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse at 35% 40%, black 0%, rgba(0,0,0,0.4) 45%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at 35% 40%, black 0%, rgba(0,0,0,0.4) 45%, transparent 85%)",
        }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(140%_120%_at_50%_10%,transparent_20%,rgba(0,0,0,1)_90%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/40 to-void" />
        <div className="absolute inset-0 opacity-25 mix-blend-overlay [background:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_2px,transparent_8px)] animate-scanlines" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-6 py-10 md:px-10 md:py-14">
        <motion.div style={{ opacity: fade }} className="flex items-start justify-between">
          <div />
          <div />
        </motion.div>

        <div className="flex flex-1 items-end">
          <motion.div style={{ y: titleY }} className="w-full pb-10 md:pb-14">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.2, 0.85, 0.2, 1], delay: 0.05 }}
              className="text-xs tracking-[0.22em] text-fog/80"
            >
              {SITE.role.toUpperCase()}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18, filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.1, ease: [0.2, 0.85, 0.2, 1] }}
              style={{ skewX, skewY, x: translateX }}
              className="mt-4 font-serif text-[clamp(3.4rem,7.5vw,6.8rem)] leading-[0.88] tracking-[-0.06em] origin-left transform-gpu"
            >
              {SITE.name}
              <span className="text-fog/70">.</span>
            </motion.h1>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/#work"
                onMouseEnter={playHover}
                onClick={playClick}
                className={cn(
                  "group relative inline-flex items-center gap-3 rounded-none border border-line/20 bg-void/35 px-5 py-3 text-xs tracking-[0.22em] text-ink backdrop-blur-md",
                  "hover:border-line/35",
                )}
              >
                <span>VIEW WORK</span>
                <span className="h-px w-10 bg-line/25 transition-all duration-300 group-hover:w-14 group-hover:bg-line/40" />
                <span className="text-fog/70">↓</span>
                <span className="pointer-events-none absolute inset-0">
                  <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/35" />
                  <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/35" />
                  <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/35" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/35" />
                </span>
              </Link>

              <div className="text-xs tracking-[0.18em] text-fog/60">
                Available for select projects.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


