"use client";

import Link from "next/link";

import { useIntroPhase } from "@/lib/introPhase";

/** The floating chat button, bottom right on every public page. It opens the full chat page. */
export function ChatBubble() {
  // Nothing floats over the intro film.
  if (useIntroPhase() !== "done") return null;

  return (
    <Link
      href="/chat"
      aria-label="Brief your project with the AI assistant"
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[60] flex items-center gap-3 md:bottom-6 md:right-6"
    >
      <span className="pointer-events-none hidden translate-x-2 whitespace-nowrap border border-line/18 bg-void/90 px-3 py-2 text-[11px] tracking-[0.22em] text-ink opacity-0 backdrop-blur-md transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:block">
        BRIEF YOUR PROJECT
      </span>
      <span className="relative grid size-14 place-items-center rounded-full border border-line/30 bg-void/90 text-ink shadow-[0_8px_30px_rgb(0_0_0/0.5)] backdrop-blur-md transition-[border-color,transform] duration-200 group-hover:scale-105 group-hover:border-line/60 group-active:scale-95">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z" />
          <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.2" />
        </svg>
      </span>
    </Link>
  );
}
