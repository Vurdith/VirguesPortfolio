"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { useAmbientPointer } from "@/hooks/useFinePointer";

const GLOW_RADIUS = 420;
const GRID_RADIUS = 260;

/**
 * A soft glow and a grid that lights up around the cursor. Both are small layers that are moved
 * with transforms, so following the cursor never repaints a full-screen gradient.
 */
export function CursorSpotlight() {
  const enabled = useAmbientPointer();

  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 140, damping: 30, mass: 0.8 });
  const sy = useSpring(y, { stiffness: 140, damping: 30, mass: 0.8 });

  React.useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, x, y]);

  const glowX = useTransform(sx, (value) => value - GLOW_RADIUS);
  const glowY = useTransform(sy, (value) => value - GLOW_RADIUS);
  const gridX = useTransform(sx, (value) => value - GRID_RADIUS);
  const gridY = useTransform(sy, (value) => value - GRID_RADIUS);
  // The grid is fixed to the screen: it slides the opposite way inside its moving window.
  const gridInnerX = useTransform(gridX, (value) => -value);
  const gridInnerY = useTransform(gridY, (value) => -value);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <motion.div
        className="absolute left-0 top-0"
        style={{
          x: glowX,
          y: glowY,
          width: GLOW_RADIUS * 2,
          height: GLOW_RADIUS * 2,
          background: `radial-gradient(${GLOW_RADIUS}px circle at 50% 50%, rgba(255,255,255,0.075), transparent 70%)`,
        }}
      />
      <motion.div
        className="absolute left-0 top-0 overflow-hidden opacity-[0.3]"
        style={{
          x: gridX,
          y: gridY,
          width: GRID_RADIUS * 2,
          height: GRID_RADIUS * 2,
          maskImage: `radial-gradient(${GRID_RADIUS}px circle at 50% 50%, #000 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(${GRID_RADIUS}px circle at 50% 50%, #000 0%, transparent 100%)`,
        }}
      >
        <motion.div
          className="absolute left-0 top-0 h-dvh w-screen"
          style={{
            x: gridInnerX,
            y: gridInnerY,
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </motion.div>
    </div>
  );
}
