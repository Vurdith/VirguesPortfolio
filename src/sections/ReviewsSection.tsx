"use client";

import * as React from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";

import type { Rating, Review } from "@/types/portfolio";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function ReviewsSection({
  reviews,
  className,
}: {
  reviews: Review[];
  className?: string;
}) {
  const approved = reviews.filter((r) => r.status === "approved");
  // Double loop is enough for seamless if we use width-based animation
  const loop = [...approved, ...approved];

  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const skewX = useTransform(scrollYProgress, [0, 1], [5, -5]);
  const skewY = useTransform(scrollYProgress, [0, 1], [1, -1]);

  return (
    <section
      id="reviews"
      ref={ref}
      className={cn("relative py-20 md:py-28", className)}
      aria-label="Reviews"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs tracking-[0.22em] text-fog/70">REVIEWS</p>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl origin-left"
            >
              Signals.
            </motion.h2>
          </div>
          <p className="max-w-lg text-pretty text-sm leading-relaxed text-fog/80">
            A public tape of feedback. Submissions are moderated in admin, only approved reviews
            play in the loop.
          </p>
        </header>

        <div className="mt-10 overflow-hidden border border-line/12 bg-void/25 backdrop-blur-sm">
          <div
            className="relative"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          >
            <motion.div
              className="flex w-max gap-6 px-6 py-6 transform-gpu"
              animate={{
                x: [0, "-50%"],
              }}
              transition={{
                duration: Math.max(approved.length * 6, 12),
                ease: "linear",
                repeat: Infinity,
              }}
            >
              {loop.map((r, idx) => (
                <ReviewChip key={`${r.id}_${idx}`} review={r} />
              ))}
            </motion.div>
          </div>
        </div>

        <ReviewCta />
      </div>
    </section>
  );
}

function ReviewChip({ review }: { review: Review }) {
  return (
    <div className="w-[min(420px,80vw)] border border-line/12 bg-void/35 px-6 py-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-[0.3em] text-ink/90 uppercase">
            {review.name}
          </div>
          <Stars rating={review.rating} />
        </div>
        <p className="text-pretty text-sm leading-relaxed text-fog/80 italic">
          “{review.text}”
        </p>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: Rating }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("text-xs", i < rating ? "text-ink/90" : "text-fog/35")}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCta() {
  const { playHover, playClick, playClose } = useUiSounds();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        playClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, playClose]);

  return (
    <>
      <div className="mt-10 flex items-center justify-end">
        <button
          type="button"
          onMouseEnter={playHover}
          onClick={() => {
            setOpen(true);
            playClick();
          }}
          className={cn(
            "group relative inline-flex items-center gap-3 rounded-none border border-line/18 bg-void/30 px-5 py-3 text-xs tracking-[0.22em] text-ink backdrop-blur-md",
            "hover:border-line/35",
          )}
        >
          <span>LEAVE A REVIEW</span>
          <span className="h-px w-10 bg-line/20 transition-all duration-300 group-hover:w-14 group-hover:bg-line/40" />
          <span className="text-fog/70">+</span>
          <span className="pointer-events-none absolute inset-0 opacity-80">
            <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
            <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
            <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
            <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <ReviewDrawer
            onClose={() => {
              setOpen(false);
              playClose();
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ReviewDrawer({ onClose }: { onClose: () => void }) {
  const { playHover, playClick } = useUiSounds();

  const [name, setName] = React.useState("");
  const [rating, setRating] = React.useState<Rating>(5);
  const [text, setText] = React.useState("");

  const [status, setStatus] = React.useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, rating, text }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to submit.");
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <motion.button
        type="button"
        aria-label="Close review form"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
        onMouseEnter={playHover}
        onClick={() => {
          onClose();
          playClick();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.85, 0.2, 1] }}
        className={cn(
          "relative w-full max-w-xl border border-line/18 bg-void/80 p-6 backdrop-blur-xl shadow-2xl",
          "transform-gpu will-change-transform",
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.22em] text-fog/70">SUBMISSION</p>
            <h3 className="mt-2 font-serif text-2xl tracking-[-0.04em]">Leave a review.</h3>
          </div>
          <button
            type="button"
            onMouseEnter={playHover}
            onClick={() => {
              onClose();
              playClick();
            }}
            className="group relative inline-flex h-10 w-10 items-center justify-center border border-line/18 bg-void/40 text-fog/70 hover:border-line/35 hover:text-ink"
            aria-label="Close"
          >
            <span className="text-lg leading-none">×</span>
            <span className="pointer-events-none absolute inset-0 opacity-80">
              <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
              <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
              <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />
            </span>
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.3em] text-fog/50 font-bold">NAME</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-3 w-full border border-line/12 bg-void/35 px-4 py-3 text-sm text-ink placeholder:text-fog/30 focus:border-line/30 outline-none transition-colors"
              placeholder="Your name"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.3em] text-fog/50 font-bold">RATING</span>
            <div className="mt-3 flex items-center gap-2 h-[46px]">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={playHover}
                  onClick={() => {
                    setRating(n);
                    playClick();
                  }}
                  className={cn(
                    "h-full aspect-square border border-line/12 bg-void/35 text-sm transition-all",
                    n <= rating ? "text-ink border-line/30 bg-void/50" : "text-fog/30",
                    "hover:border-line/25 hover:text-fog/60",
                  )}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  aria-pressed={n === rating}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-[10px] tracking-[0.22em] text-fog/70">MESSAGE</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 h-28 w-full resize-none border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="Keep it short. Keep it real."
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-fog/70">
            {status === "sent" ? (
              <span className="text-ink/90">Submitted. Pending moderation.</span>
            ) : status === "error" ? (
              <span className="text-fog/80">{error ?? "Failed to submit."}</span>
            ) : (
              <span>Visible only after approval.</span>
            )}
          </div>

          <button
            type="button"
            disabled={status === "submitting" || status === "sent" || !name.trim() || !text.trim()}
            onMouseEnter={playHover}
            onClick={() => {
              playClick();
              void submit();
            }}
            className={cn(
              "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink",
              "hover:border-line/35 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span>{status === "submitting" ? "SENDING" : status === "sent" ? "SENT" : "SUBMIT"}</span>
            <span className="h-px w-10 bg-line/20" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


