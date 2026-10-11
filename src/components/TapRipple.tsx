"use client";

import * as React from "react";

import { useFinePointer } from "@/hooks/useFinePointer";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

type Ripple = { id: number; x: number; y: number };

/** Touch-device counterpart to the custom cursor: a soft ring expands where you tap. */
export function TapRipple() {
  const fine = useFinePointer();
  const { reduced } = useMotionPreference();
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const nextId = React.useRef(0);

  const active = !fine && !reduced;

  React.useEffect(() => {
    if (!active) return;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const id = nextId.current++;
      setRipples((current) => [...current.slice(-4), { id, x: event.clientX, y: event.clientY }]);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [active]);

  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="tap-ripple absolute size-16 rounded-full border border-white/50"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={() => setRipples((current) => current.filter((r) => r.id !== ripple.id))}
        />
      ))}
    </div>
  );
}
