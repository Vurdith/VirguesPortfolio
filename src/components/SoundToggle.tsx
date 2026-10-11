"use client";

import { motion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function SoundToggle({ className }: { className?: string }) {
  const { muted, toggleMuted } = useUiSounds();

  return (
    <motion.button
      type="button"
      onClick={toggleMuted}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative inline-flex h-9 items-center gap-2.5 rounded-none border border-line/15 bg-void/40 px-3 text-xs tracking-[0.22em] text-fog/80 backdrop-blur-md",
        "hover:border-line/30 hover:text-ink",
        
        className,
      )}
      aria-pressed={!muted}
    >
      <div className="relative flex h-3 w-3 items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-full w-full"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          {!muted ? (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
            />
          ) : (
            <path d="M23 9l-6 6M17 9l6 6" className="opacity-60" />
          )}
        </svg>
      </div>
      <span className="text-[10px] opacity-70">SOUND {muted ? "OFF" : "ON"}</span>

      <CornerMarks
        size={2}
        tone="border-line/35"
        className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </motion.button>
  );
}


