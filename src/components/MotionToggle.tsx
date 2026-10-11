"use client";

import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

/** Manual switch for animations, for visitors whose OS does not (or cannot) ask for reduced motion. */
export function MotionToggle({ className }: { className?: string }) {
  const { reduced, toggle } = useMotionPreference();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!reduced}
      className={cn(
        "group relative inline-flex h-9 items-center gap-2.5 rounded-none border border-line/15 bg-void/40 px-3 text-xs tracking-[0.22em] text-fog/80 backdrop-blur-md",
        "hover:border-line/30 hover:text-ink",
        className,
      )}
    >
      <span className="text-[10px] opacity-70">MOTION</span>
      <span className="text-[10px]">{reduced ? "OFF" : "ON"}</span>
      <CornerMarks
        size={2}
        tone="border-line/35"
        className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </button>
  );
}
