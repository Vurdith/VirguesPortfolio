"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

import { useFinePointer } from "@/hooks/useFinePointer";

type CursorMode = "default" | "link" | "view" | "hidden";

const INTERACTIVE = 'a, button, [role="button"], label, summary';
const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]';

function modeFor(target: EventTarget | null): CursorMode {
  if (!(target instanceof Element)) return "default";
  if (target.closest(TEXT_FIELDS)) return "hidden";
  if (target.closest('[data-cursor="view"]')) return "view";
  if (target.closest(INTERACTIVE)) return "link";
  return "default";
}

export function CustomCursor() {
  const enabled = useFinePointer();
  const [mode, setMode] = React.useState<CursorMode>("default");
  const [pressed, setPressed] = React.useState(false);
  const [inside, setInside] = React.useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 420, damping: 38, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 420, damping: 38, mass: 0.6 });

  React.useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setInside(true);
    };
    const onOver = (event: PointerEvent) => setMode(modeFor(event.target));
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setInside(false);
    const onEnter = () => setInside(true);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);

    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const visible = inside && mode !== "hidden";
  const ringSize = mode === "view" ? 92 : mode === "link" ? 52 : 30;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[200] mix-blend-difference">
      <motion.div className="absolute left-0 top-0" style={{ x, y }}>
        <motion.div
          className="-ml-[3px] -mt-[3px] size-[6px] rounded-full bg-white"
          animate={{ opacity: visible && mode !== "view" ? 1 : 0, scale: pressed ? 0.6 : 1 }}
          transition={{ duration: 0.18 }}
        />
      </motion.div>

      <motion.div className="absolute left-0 top-0" style={{ x: ringX, y: ringY }}>
        <motion.div
          className="grid place-items-center rounded-full border border-white"
          style={{ translateX: "-50%", translateY: "-50%" }}
          initial={false}
          animate={{
            width: ringSize,
            height: ringSize,
            opacity: visible ? 1 : 0,
            scale: pressed ? 0.88 : 1,
            backgroundColor: mode === "view" ? "rgba(255,255,255,1)" : "rgba(255,255,255,0)",
          }}
          transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.7 }}
        >
          <motion.span
            className="text-[10px] font-semibold tracking-[0.22em] text-black"
            animate={{ opacity: mode === "view" ? 1 : 0, scale: mode === "view" ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
          >
            VIEW
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
}
