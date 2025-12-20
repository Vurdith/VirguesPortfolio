"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function SoundToggle({ className }: { className?: string }) {
  const { muted, toggleMuted, playClick } = useUiSounds();

  return (
    <motion.button
      type="button"
      onClick={() => {
        toggleMuted();
        playClick();
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative inline-flex h-9 items-center gap-2.5 rounded-none border border-line/15 bg-void/40 px-3 text-xs tracking-[0.22em] text-fog/80 backdrop-blur-md",
        "hover:border-line/30 hover:text-ink",
        "focus-visible:outline-none",
        className,
      )}
      aria-pressed={!muted}
      aria-label={muted ? "Enable UI sounds" : "Disable UI sounds"}
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
      <span className="text-[10px] opacity-70">{muted ? "OFF" : "ON"}</span>

      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-line/35" />
        <span className="absolute right-0 top-0 h-2 w-2 border-r border-t border-line/35" />
        <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-line/35" />
        <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-line/35" />
      </span>
    </motion.button>
  );
}


