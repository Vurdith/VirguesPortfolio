"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

const TICKS = Array.from({ length: 48 }, (_, index) => index);
const STRUTS = Array.from({ length: 9 }, (_, index) => index);
const CORRIDOR_LINES = Array.from({ length: 8 }, (_, index) => index);

export function SignalCathedral() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 28,
    mass: 0.75,
  });

  const opacity = useTransform(progress, [0, 0.08, 0.18, 0.84, 1], [0.12, 0.2, 0.34, 0.28, 0.18]);
  const y = useTransform(progress, [0, 1], [34, -58]);
  const rotate = useTransform(progress, [0, 1], [-4, 5]);
  const scale = useTransform(progress, [0, 0.35, 0.7, 1], [0.82, 1, 1.09, 0.96]);

  const fragmentOpacity = useTransform(progress, [0, 0.16, 0.3], [0.9, 0.45, 0.08]);
  const ringOpacity = useTransform(progress, [0.08, 0.22, 0.62, 0.82], [0, 0.88, 0.72, 0.24]);
  const ringPath = useTransform(progress, [0.08, 0.42], [0.08, 1]);
  const corridorOpacity = useTransform(progress, [0.25, 0.48, 0.72, 0.9], [0, 0.7, 0.74, 0.16]);
  const monolithOpacity = useTransform(progress, [0.62, 0.86, 1], [0, 0.72, 0.86]);
  const signalY = useTransform(progress, [0, 1], [130, -170]);

  if (prefersReducedMotion) {
    return (
      <div
        data-signal-cathedral
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden opacity-[0.16] mix-blend-screen"
      >
        <svg className="h-full w-full" viewBox="0 0 1440 1100" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="white" strokeWidth="1">
            <ellipse cx="720" cy="420" rx="235" ry="118" opacity="0.42" />
            <ellipse cx="720" cy="420" rx="310" ry="154" opacity="0.18" />
            <path d="M535 820 L720 225 L905 820 Z" opacity="0.18" />
            <path d="M610 845 H830 V360 H610 Z" opacity="0.18" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <motion.div
      data-signal-cathedral
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden mix-blend-screen"
      style={{ opacity }}
    >
      <motion.svg
        className="h-full w-full transform-gpu"
        viewBox="0 0 1440 1100"
        preserveAspectRatio="xMidYMid slice"
        style={{ y, rotate, scale, transformOrigin: "50% 48%" }}
      >
        <defs>
          <linearGradient id="signal-fade" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="46%" stopColor="white" stopOpacity="0.72" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="signal-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
            <stop offset="42%" stopColor="white" stopOpacity="0.04" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        <motion.g style={{ opacity: fragmentOpacity }} stroke="white" strokeWidth="1" fill="none">
          {STRUTS.map((index) => {
            const x = 395 + index * 80;
            const stagger = index % 2 === 0 ? 26 : -18;

            return (
              <g key={index} opacity={0.2 + index * 0.035}>
                <path d={`M${x} ${230 + stagger} h${36 + index * 2}`} />
                <path d={`M${x + 20} ${715 - stagger} h${52 - index * 2}`} />
                <path d={`M${x + 12} ${330 + stagger} v${40 + index * 4}`} opacity="0.5" />
              </g>
            );
          })}
        </motion.g>

        <motion.g style={{ opacity: ringOpacity }} fill="none" stroke="white" strokeWidth="1">
          <motion.ellipse cx="720" cy="400" rx="250" ry="118" style={{ pathLength: ringPath }} opacity="0.6" />
          <motion.ellipse cx="720" cy="400" rx="326" ry="154" style={{ pathLength: ringPath }} opacity="0.24" />
          <motion.ellipse cx="720" cy="400" rx="168" ry="80" style={{ pathLength: ringPath }} opacity="0.32" />

          <g transform="translate(720 400)">
            {TICKS.map((tick) => {
              const angle = (tick / TICKS.length) * 360;
              const major = tick % 4 === 0;

              return (
                <motion.line
                  key={tick}
                  x1={major ? 286 : 300}
                  x2={major ? 326 : 318}
                  y1="0"
                  y2="0"
                  strokeWidth={major ? 1.15 : 0.75}
                  opacity={major ? 0.48 : 0.25}
                  transform={`rotate(${angle}) scale(1 0.48)`}
                  style={{ pathLength: ringPath }}
                />
              );
            })}
          </g>

          <motion.path
            d="M440 720 C560 610 618 510 720 400 C826 512 890 624 1000 720"
            style={{ pathLength: ringPath }}
            opacity="0.2"
          />
        </motion.g>

        <motion.g style={{ opacity: corridorOpacity }} fill="none" stroke="white" strokeWidth="1">
          {CORRIDOR_LINES.map((line) => {
            const offset = line * 52;
            return (
              <g key={line} opacity={0.12 + line * 0.035}>
                <path d={`M${280 + offset} 1010 L720 365 L${1160 - offset} 1010`} />
                <path d={`M${285 + offset} 880 H${1155 - offset}`} opacity="0.42" />
              </g>
            );
          })}
          <motion.line
            x1="720"
            x2="720"
            y1="250"
            y2="1040"
            stroke="url(#signal-fade)"
            style={{ y: signalY }}
            opacity="0.64"
          />
        </motion.g>

        <motion.g style={{ opacity: monolithOpacity }} fill="none" stroke="white" strokeWidth="1">
          <rect x="610" y="332" width="220" height="520" opacity="0.18" />
          <rect x="644" y="380" width="152" height="374" opacity="0.28" />
          <path d="M610 332 L720 248 L830 332" opacity="0.24" />
          <path d="M610 852 L720 930 L830 852" opacity="0.18" />
          <path d="M574 430 H866 M574 610 H866 M574 790 H866" opacity="0.14" />
          <circle cx="720" cy="590" r="28" opacity="0.26" />
          <circle cx="720" cy="590" r="78" opacity="0.12" />
        </motion.g>

        <circle cx="720" cy="400" r="320" fill="url(#signal-core)" />
      </motion.svg>
    </motion.div>
  );
}
