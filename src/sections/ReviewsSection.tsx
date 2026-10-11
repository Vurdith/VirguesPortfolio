"use client";

import * as React from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";

import type { PublicReview } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { ReviewModal } from "@/components/reviews/ReviewModal";
import { ReviewThread } from "@/components/reviews/ReviewThread";
import { Stars } from "@/components/Stars";
import { cn } from "@/lib/cn";

export function ReviewsSection({
  reviews,
  className,
}: {
  reviews: PublicReview[];
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
  const [openId, setOpenId] = React.useState<string | null>(null);
  const openReview = approved.find((review) => review.id === openId) ?? null;
  const closeThread = React.useCallback(() => setOpenId(null), []);

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
            <RevealHeading className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">Signals.</RevealHeading>
          </div>
          <p className="max-w-lg text-pretty text-sm leading-relaxed text-fog/80">
            Feedback from past clients. Every review is checked before it goes live.
          </p>
        </header>

        {hasReviews ? (
          <ReviewRail
            reviews={loop}
            baseCount={approved.length}
            onOpen={setOpenId}
            shouldAnimate={!shouldReduceMotion && approved.length > 1}
            duration={Math.max(approved.length * 7, 18)}
          />
        ) : (
          <EmptyReviews />
        )}

        <ReviewCta />
      </div>

      <AnimatePresence>
        {openReview ? <ReviewThread key={openReview.id} review={openReview} onClose={closeThread} /> : null}
      </AnimatePresence>
    </section>
  );
}

function buildReviewLoop(reviews: PublicReview[]) {
  if (reviews.length <= 1) return reviews;
  const copies = reviews.length < 4 ? 4 : 2;
  return Array.from({ length: copies }, () => reviews).flat();
}

function ReviewRail({
  reviews,
  baseCount,
  onOpen,
  shouldAnimate,
  duration,
}: {
  reviews: PublicReview[];
  /** How many of the cards are real; the rest are copies that keep the loop seamless. */
  baseCount: number;
  onOpen: (id: string) => void;
  shouldAnimate: boolean;
  duration: number;
}) {
  return (
    <div
      className="review-rail perf-card mt-10 overflow-hidden border border-line/12 bg-void/25"
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
            <ReviewChip key={`${review.id}-${idx}`} review={review} copy={idx >= baseCount} onOpen={onOpen} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .review-rail-track.is-animated {
          animation: reviewRail var(--review-duration) linear infinite;
          will-change: transform;
        }

        .review-rail:hover .review-rail-track.is-animated,
        .review-rail:focus-within .review-rail-track.is-animated {
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
    <div className="perf-card mt-10 border border-line/12 bg-void/25 p-6">
      <div className="max-w-2xl">
        <p className="text-[11px] tracking-[0.28em] text-fog/72">NO APPROVED REVIEWS YET</p>
        <p className="mt-3 text-sm leading-relaxed text-fog/78">
          Reviews from clients will show up here. If we have worked together, you can leave one
          below.
        </p>
      </div>
    </div>
  );
}

function ReviewChip({
  review,
  copy,
  onOpen,
}: {
  review: PublicReview;
  copy: boolean;
  onOpen: (id: string) => void;
}) {
  const images = review.attachments?.length ?? 0;
  const replies = review.replies.length;
  const extras = [
    images ? `${images} IMAGE${images === 1 ? "" : "S"}` : null,
    replies ? `${replies} ${replies === 1 ? "REPLY" : "REPLIES"}` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onOpen(review.id)}
      tabIndex={copy ? -1 : undefined}
      aria-hidden={copy || undefined}
      aria-label={`Open the thread for ${review.name || "Anonymous"}'s review`}
      className="perf-card group relative flex w-[min(420px,80vw)] flex-col gap-3 border border-line/12 bg-void/35 px-6 py-5 text-left transition-colors duration-300 hover:border-line/35 focus-visible:border-line/35"
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div className="truncate text-[11px] font-bold uppercase tracking-[0.3em] text-ink/90">
          {review.name || "Anonymous"}
        </div>
        <Stars rating={review.rating} />
      </div>
      <p className="line-clamp-5 text-pretty text-sm italic leading-relaxed text-fog/80">
        &quot;{review.text}&quot;
      </p>
      <div className="mt-auto flex items-center justify-between gap-4 pt-1 text-[10px] tracking-[0.22em] text-fog/70">
        <span className="truncate">{extras.join("  /  ")}</span>
        <span className="shrink-0 text-fog/80 transition-colors duration-300 group-hover:text-ink">
          OPEN <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </button>
  );
}

function ReviewCta() {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <div className="mt-10 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            "group relative inline-flex items-center gap-3 rounded-none border border-line/18 bg-void/30 px-5 py-3 text-xs tracking-[0.22em] text-ink backdrop-blur-md",
            "hover:border-line/35",
          )}
        >
          <span>LEAVE A REVIEW</span>
          <span className="h-px w-10 bg-line/20 transition-all duration-300 group-hover:w-14 group-hover:bg-line/40" />
          <span className="text-fog/70">+</span>
          <CornerMarks className="opacity-80" />
        </button>
      </div>

      <AnimatePresence>{open ? <ReviewModal onClose={close} /> : null}</AnimatePresence>
    </>
  );
}
