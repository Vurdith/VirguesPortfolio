"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import type { Rating, Review } from "@/types/portfolio";
import { MonoIcon } from "@/components/MonoIcon";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

type SubmitState = "idle" | "submitting" | "sent" | "error";

export function ReviewsSection({
  reviews,
  className,
}: {
  reviews: Review[];
  className?: string;
}) {
  const approved = React.useMemo(
    () => reviews.filter((review) => review.status === "approved" && review.text.trim()),
    [reviews],
  );
  const hasReviews = approved.length > 0;
  const loop = React.useMemo(() => buildReviewLoop(approved), [approved]);
  const shouldReduceMotion = useReducedMotion();

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
      className={cn("relative overflow-hidden py-20 md:py-28", className)}
      aria-label="Reviews"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="review" className="size-4" />
              <span>REVIEWS</span>
            </div>
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl"
            >
              Signals.
            </motion.h2>
          </div>
          <p className="max-w-lg text-pretty text-sm leading-relaxed text-fog/80">
            Feedback only appears after approval, so the public loop stays clean and the form can
            accept new submissions without turning the page noisy.
          </p>
        </header>

        {hasReviews ? (
          <ReviewRail
            reviews={loop}
            shouldAnimate={!shouldReduceMotion && approved.length > 1}
            duration={Math.max(approved.length * 7, 18)}
          />
        ) : (
          <EmptyReviews />
        )}

        <ReviewCta />
      </div>
    </section>
  );
}

function buildReviewLoop(reviews: Review[]) {
  if (reviews.length <= 1) return reviews;
  const copies = reviews.length < 4 ? 4 : 2;
  return Array.from({ length: copies }, () => reviews).flat();
}

function ReviewRail({
  reviews,
  shouldAnimate,
  duration,
}: {
  reviews: Review[];
  shouldAnimate: boolean;
  duration: number;
}) {
  return (
    <div
      className="review-rail perf-card mt-10 overflow-hidden border border-line/12 bg-void/25 backdrop-blur-sm"
      style={{ "--review-duration": `${duration}s` } as React.CSSProperties}
    >
      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div
          className={cn(
            "review-rail-track flex w-max gap-6 px-6 py-6 transform-gpu",
            shouldAnimate && "is-animated"
          )}
        >
          {reviews.map((review, idx) => (
            <ReviewChip key={`${review.id}-${idx}`} review={review} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .review-rail-track.is-animated {
          animation: reviewRail var(--review-duration) linear infinite;
          will-change: transform;
        }

        .review-rail:hover .review-rail-track.is-animated {
          animation-play-state: paused;
        }

        @keyframes reviewRail {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .review-rail-track.is-animated {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function EmptyReviews() {
  return (
    <div className="perf-card mt-10 border border-line/12 bg-void/25 p-6 backdrop-blur-sm">
      <div className="max-w-2xl">
        <p className="text-[10px] tracking-[0.28em] text-fog/60">NO APPROVED REVIEWS YET</p>
        <p className="mt-3 text-sm leading-relaxed text-fog/78">
          The review loop will appear once a submission is approved in admin. New reviews can still
          be submitted below.
        </p>
      </div>
    </div>
  );
}

function ReviewChip({ review }: { review: Review }) {
  return (
    <article className="perf-card w-[min(420px,80vw)] border border-line/12 bg-void/35 px-6 py-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.3em] text-ink/90">
            {review.name || "Anonymous"}
          </div>
          <Stars rating={review.rating} />
        </div>
        <p className="line-clamp-5 text-pretty text-sm italic leading-relaxed text-fog/80">
          &quot;{review.text}&quot;
        </p>
      </div>
    </article>
  );
}

function Stars({ rating }: { rating: Rating }) {
  return (
    <div className="flex shrink-0 items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("text-xs", i < rating ? "text-ink/90" : "text-fog/35")}
        >
          *
        </span>
      ))}
    </div>
  );
}

function ReviewCta() {
  const { playHover, playClick, playClose } = useUiSounds();
  const [open, setOpen] = React.useState(false);

  const close = React.useCallback(() => {
    setOpen(false);
    playClose();
  }, [playClose]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

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
          <CornerLines />
        </button>
      </div>

      <AnimatePresence>
        {open ? <ReviewDrawer onClose={close} /> : null}
      </AnimatePresence>
    </>
  );
}

function ReviewDrawer({ onClose }: { onClose: () => void }) {
  const { playHover, playClick } = useUiSounds();

  const [name, setName] = React.useState("");
  const [rating, setRating] = React.useState<Rating>(5);
  const [text, setText] = React.useState("");
  const [status, setStatus] = React.useState<SubmitState>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedText = text.trim();
  const isValid = trimmedName.length >= 2 && trimmedText.length >= 8;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || status === "submitting" || status === "sent") return;

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmedName.slice(0, 80),
          rating,
          text: trimmedText.slice(0, 600),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to submit.");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
    >
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

      <motion.form
        onSubmit={submit}
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
            <h3 id="review-title" className="mt-2 font-serif text-2xl tracking-[-0.04em]">
              Leave a review.
            </h3>
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
            <span className="text-lg leading-none">x</span>
            <CornerLines />
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.3em] text-fog/50">NAME</span>
            <input
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className="mt-3 w-full border border-line/12 bg-void/35 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/30 focus:border-line/30"
              placeholder="Your name"
              autoComplete="name"
            />
          </label>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.3em] text-fog/50">RATING</span>
            <div className="mt-3 flex h-[46px] items-center gap-2" role="radiogroup" aria-label="Rating">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={n === rating}
                  onMouseEnter={playHover}
                  onClick={() => {
                    setRating(n);
                    playClick();
                  }}
                  className={cn(
                    "aspect-square h-full border border-line/12 bg-void/35 text-sm transition-all",
                    n <= rating ? "border-line/30 bg-void/50 text-ink" : "text-fog/30",
                    "hover:border-line/25 hover:text-fog/60",
                  )}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  *
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-[10px] tracking-[0.22em] text-fog/70">MESSAGE</span>
          <textarea
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 h-28 w-full resize-none border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="Keep it short. Keep it real."
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-fog/70" aria-live="polite">
            {status === "sent" ? (
              <span className="text-ink/90">Submitted. Pending moderation.</span>
            ) : status === "error" ? (
              <span className="text-fog/80">{error ?? "Failed to submit."}</span>
            ) : !isValid ? (
              <span>Name needs 2 characters. Message needs 8.</span>
            ) : (
              <span>Visible only after approval.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "submitting" || status === "sent" || !isValid}
            onMouseEnter={playHover}
            onClick={playClick}
            className={cn(
              "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink",
              "hover:border-line/35 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span>{status === "submitting" ? "SENDING" : status === "sent" ? "SENT" : "SUBMIT"}</span>
            <span className="h-px w-10 bg-line/20" />
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function CornerLines() {
  return (
    <span className="pointer-events-none absolute inset-0 opacity-80">
      <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />
    </span>
  );
}
