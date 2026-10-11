"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

import { useAmbientPointer } from "@/hooks/useFinePointer";

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

  const glow = useMotionTemplate`radial-gradient(420px circle at ${sx}px ${sy}px, rgba(255,255,255,0.075), transparent 70%)`;
  const gridMask = useMotionTemplate`radial-gradient(260px circle at ${sx}px ${sy}px, #000 0%, transparent 100%)`;

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <motion.div className="absolute inset-0" style={{ background: glow }} />
      <motion.div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: gridMask,
          WebkitMaskImage: gridMask,
        }}
      />
    </div>
  );
}
