import { cn } from "@/lib/cn";

export type AgentMode = "idle" | "thinking" | "away";

/**
 * The assistant's face: a little robot whose eyes blink, whose antenna pulses and whose eyes scan
 * side to side while it works on a reply. Pure SVG and CSS, so it is cheap enough to sit next to
 * every message. Motion is switched off for visitors who ask for less of it (see globals.css).
 */
export function AgentIcon({ mode = "idle", size = 32, className }: { mode?: AgentMode; size?: number; className?: string }) {
  return (
    <span
      className={cn("agent-icon relative inline-grid shrink-0 place-items-center rounded-full border border-line/25 bg-[#141416] text-ink", className)}
      data-mode={mode}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {mode === "thinking" ? <span className="agent-halo absolute inset-0 rounded-full border border-ink/50" /> : null}
      <svg viewBox="0 0 32 32" width={size * 0.66} height={size * 0.66} fill="none" className="agent-body">
        <line x1="16" y1="5.5" x2="16" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <circle className="agent-antenna" cx="16" cy="4.4" r="1.7" fill="currentColor" />
        <rect x="6" y="9" width="20" height="16" rx="5.5" stroke="currentColor" strokeWidth="1.4" opacity="0.9" />
        <g className="agent-eyes">
          <rect className="agent-eye" x="11" y="14.5" width="2.8" height="4.6" rx="1.4" fill="currentColor" />
          <rect className="agent-eye" x="18.2" y="14.5" width="2.8" height="4.6" rx="1.4" fill="currentColor" />
        </g>
        <path d="M12.5 22h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
        <path d="M3.5 15v4M28.5 15v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      </svg>
    </span>
  );
}

/** The customer's avatar. While they type, rings ripple out from it. */
export function YouIcon({ typing = false, size = 32, className }: { typing?: boolean; size?: number; className?: string }) {
  return (
    <span
      className={cn("you-icon relative inline-grid shrink-0 place-items-center rounded-full border border-line/25 bg-gradient-to-b from-white/[0.14] to-white/[0.04] text-ink", className)}
      data-typing={typing}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {typing ? (
        <>
          <span className="you-ring absolute inset-0 rounded-full border border-ink/50" />
          <span className="you-ring you-ring-late absolute inset-0 rounded-full border border-ink/40" />
        </>
      ) : null}
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="you-body">
        <circle cx="16" cy="12" r="4.6" />
        <path d="M7 26c.9-4.6 4.4-7 9-7s8.1 2.4 9 7" />
      </svg>
    </span>
  );
}

/** The owner's avatar, when they have taken over the chat. */
export function OwnerIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full border border-line/40 bg-ink font-serif leading-none text-void", className)}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      V
    </span>
  );
}

/** Three bouncing dots, for "someone is typing". */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span key={index} className="typing-dot size-1.5 rounded-full bg-current" style={{ animationDelay: `${index * 140}ms` }} />
      ))}
    </span>
  );
}
