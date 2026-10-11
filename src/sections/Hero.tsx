"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";
import { useDeviceTilt } from "@/hooks/useDeviceTilt";
import { useAmbientPointer, useFinePointer } from "@/hooks/useFinePointer";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

// WebGL code only loads on devices that will actually run it.
const HeroShader = dynamic(() => import("@/components/HeroShader"), { ssr: false });

export function Hero({ className }: { className?: string }) {
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

  const parallax = useAmbientPointer();
  const finePointer = useFinePointer();
  const { reduced: motionOff } = useMotionPreference();
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const imageX = useSpring(useTransform(pointerX, [-0.5, 0.5], [28, -28]), {
    stiffness: 70,
    damping: 22,
    mass: 0.8,
  });
  const imageY = useSpring(useTransform(pointerY, [-0.5, 0.5], [18, -18]), {
    stiffness: 70,
    damping: 22,
    mass: 0.8,
  });

  // Phones have no mouse, so their tilt drives the same parallax.
  useDeviceTilt(!finePointer && !reduceMotion && !motionOff, (x, y) => {
    pointerX.set(x);
    pointerY.set(y);
  });

  React.useEffect(() => {
    if (!parallax) return;
    const onMove = (event: PointerEvent) => {
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax, pointerX, pointerY]);

  const skewX = useTransform(scrollYProgress, [0, 0.5], [0, -15]);
  const skewY = useTransform(scrollYProgress, [0, 0.5], [0, 2]);
  const translateX = useTransform(scrollYProgress, [0, 0.5], [0, 40]);

  return (
    <section
      id="top"
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
          opacity: bgOpacity,
          maskImage: "radial-gradient(ellipse at 35% 40%, black 0%, rgba(0,0,0,0.4) 45%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at 35% 40%, black 0%, rgba(0,0,0,0.4) 45%, transparent 85%)",
        }}
      >
        <motion.div className="absolute inset-[-3%]" style={{ x: imageX, y: imageY }}>
          <Image
            src={SITE.heroImage}
            alt=""
            fill
            priority
            quality={82}
            sizes="100vw"
            className="object-cover object-center"
          />
          {motionOff ? null : <HeroShader src={SITE.heroImage} />}
        </motion.div>
      </motion.div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(140%_120%_at_50%_10%,transparent_20%,rgba(0,0,0,1)_90%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/40 to-void" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-6 py-10 md:px-10 md:py-14">
        <motion.div style={{ opacity: fade }} className="flex items-start justify-between">
          <div />
          <div />
        </motion.div>

        <div className="flex flex-1 items-end">
          <motion.div style={{ y: titleY }} className="w-full pb-10 md:pb-14">
            <p className="hero-fade text-xs tracking-[0.22em] text-fog/80">
              {SITE.role.toUpperCase()}
            </p>

            <motion.h1
              style={{ skewX, skewY, x: translateX }}
              className="hero-fade mt-4 font-serif text-[clamp(3.4rem,7.5vw,6.8rem)] leading-[0.88] tracking-[-0.06em] origin-left transform-gpu"
            >
              {SITE.name}
              <span className="text-fog/70">.</span>
            </motion.h1>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/#work"
                className={cn(
                  "group relative inline-flex items-center gap-3 rounded-none border border-line/20 bg-void/70 px-5 py-3 text-xs tracking-[0.22em] text-ink",
                  "hover:border-line/35",
                )}
              >
                <span>VIEW WORK</span>
                <span className="h-px w-10 bg-line/25 transition-all duration-300 group-hover:w-14 group-hover:bg-line/40" />
                <MonoIcon name="work" className="size-4" />
                <CornerMarks tone="border-line/35" />
              </Link>

              <Link
                href="/#quote"
                className="quote-cta inline-flex items-center gap-3 border border-line/20 bg-ink px-5 py-3 text-xs tracking-[0.22em] text-void"
              >
                <span>REQUEST A QUOTE</span>
                <span aria-hidden="true" className="quote-cta-arrow">
                  ↗
                </span>
              </Link>

              <AvailabilityBadge />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


