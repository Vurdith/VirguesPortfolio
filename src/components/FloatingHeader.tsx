"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";
import { SoundToggle } from "@/components/SoundToggle";

const NAV = [
  { label: "WORK", href: "/#work" },
  { label: "PROCESS", href: "/#process" },
  { label: "REVIEWS", href: "/#reviews" },
  { label: "CONTACT", href: "/#contact" },
] as const;

export function FloatingHeader({ className }: { className?: string }) {
  const { playHover, playClick } = useUiSounds();
  const { scrollY } = useScroll();

  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [indicatorProps, setIndicatorProps] = React.useState({ x: 0, width: 0 });

  const y = useSpring(useTransform(scrollY, [0, 180], [0, -4]), {
    stiffness: 520,
    damping: 54,
    mass: 0.7,
  });
  const scale = useSpring(useTransform(scrollY, [0, 180], [1, 0.985]), {
    stiffness: 520,
    damping: 54,
    mass: 0.7,
  });
  const opacity = useSpring(useTransform(scrollY, [0, 180], [1, 0.96]), {
    stiffness: 520,
    damping: 54,
    mass: 0.7,
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (parentRect) {
      setIndicatorProps({
        x: rect.left - parentRect.left,
        width: rect.width,
      });
      setHoveredIdx(idx);
    }
    playHover();
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  return (
    <motion.header
      className={cn(
        "fixed left-1/2 top-6 z-50 w-[min(980px,calc(100vw-2.25rem))] -translate-x-1/2",
        "transform-gpu will-change-transform",
        className,
      )}
      style={{ y, scale, opacity }}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.85, ease: [0.2, 0.85, 0.2, 1] }}
    >
      <div className="pointer-events-auto relative flex items-center justify-between gap-4 border border-white/10 bg-black/10 px-4 py-3 backdrop-blur-3xl md:px-5">
        {/* Balanced Moving Grain Overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -inset-[200%] opacity-15 mix-blend-overlay"
            animate={{
              x: [0, -20, 10, -30, 0],
              y: [0, 10, -20, 15, 0],
            }}
            transition={{
              duration: 0.15,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")`,
              backgroundSize: "128px 128px",
              filter: "contrast(140%) brightness(110%)"
            }}
          />
        </div>

        <CornerFrame />

        <div
          className={cn(
            "relative z-10 flex items-baseline gap-2 whitespace-nowrap",
            "text-xs tracking-[0.22em] text-ink",
          )}
        >
          <span className="font-serif text-sm tracking-[-0.02em]">D</span>
          <span className="text-fog/80">/</span>
          <span className="text-fog/80">PORTFOLIO</span>
        </div>

        <nav 
          className="relative hidden items-center gap-2 md:flex" 
          aria-label="Primary"
          onMouseLeave={handleMouseLeave}
        >
          {/* Sliding Indicator */}
          <motion.div
            className="absolute bottom-0 h-full border border-line/20 bg-white/[0.03]"
            initial={false}
            animate={{
              x: indicatorProps.x,
              width: indicatorProps.width,
              opacity: hoveredIdx !== null ? 1 : 0,
              scaleY: hoveredIdx !== null ? 1 : 0.8,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
            }}
          />

          {NAV.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={(e) => handleMouseEnter(e, idx)}
              onClick={playClick}
              className={cn(
                "relative z-10 px-3 py-1.5 text-[10px] tracking-[0.28em] text-fog/70 transition-colors duration-300",
                hoveredIdx === idx ? "text-ink" : "hover:text-fog/90",
              )}
            >
              <ScrambleText text={item.label} isHovered={hoveredIdx === idx} />
            </Link>
          ))}
        </nav>

        <div className="relative z-10 flex items-center gap-2">
          <SoundToggle />
        </div>
      </div>
    </motion.header>
  );
}

function ScrambleText({ text, isHovered }: { text: string; isHovered: boolean }) {
  const [display, setDisplay] = React.useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  
  React.useEffect(() => {
    if (!isHovered) {
      setDisplay(text);
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [isHovered, text]);

  return <span>{display}</span>;
}

function CornerFrame() {
  return (
    <span className="pointer-events-none absolute inset-0 opacity-80">
      <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />

      <span className="absolute left-0 top-1/2 h-px w-3 bg-line/10" />
      <span className="absolute right-0 top-1/2 h-px w-3 bg-line/10" />
    </span>
  );
}


