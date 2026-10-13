"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { Review, ReviewAttachment, ReviewReply, ReviewStatus } from "@/types/portfolio";
import { Lightbox } from "@/components/reviews/Lightbox";
import { cn } from "@/lib/cn";

import { ReviewCard, hasPendingReplies } from "./ReviewCard";

type Filter = "pending" | "approved" | "rejected" | "all";
type Viewer = { images: ReviewAttachment[]; index: number } | null;

const TABS: { id: Filter; label: string }[] = [
  { id: "pending", label: "PENDING" },
  { id: "approved", label: "APPROVED" },
  { id: "rejected", label: "REJECTED" },
  { id: "all", label: "ALL" },
];

/** Needs a decision: the review itself, or a reply on it, is waiting. */
const needsAttention = (review: Review) => review.status === "pending" || hasPendingReplies(review);

const matches = (review: Review, filter: Filter) =>
  filter === "all" ? true : filter === "pending" ? needsAttention(review) : review.status === filter;

export function ReviewsModerationTable({ initialReviews }: { initialReviews: Review[] }) {
  const reduceMotion = useReducedMotion();
  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
  const [filter, setFilter] = React.useState<Filter>(() =>
    initialReviews.some(needsAttention) ? "pending" : "all",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [viewer, setViewer] = React.useState<Viewer>(null);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const counts = React.useMemo(
    () => Object.fromEntries(TABS.map((tab) => [tab.id, reviews.filter((r) => matches(r, tab.id)).length])) as Record<Filter, number>,
    [reviews],
  );

  const visible = React.useMemo(() => {
    const rank: Record<ReviewStatus, number> = { pending: 0, approved: 1, rejected: 2 };
    return reviews
      .filter((review) => matches(review, filter))
      .sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt));
  }, [reviews, filter]);

  /** Applies a change at once and puts the old list back if the server refuses it. */
  const mutate = React.useCallback(
    async (apply: (list: Review[]) => Review[], request: () => Promise<Response>, failure: string) => {
      const previous = reviews;
      setError(null);
      setReviews(apply);
      try {
        const res = await request();
        if (!res.ok) throw new Error(failure);
        return true;
      } catch (err) {
        setReviews(previous);
        setError(err instanceof Error ? err.message : failure);
        return false;
      }
    },
    [reviews],
  );

  const send = (url: string, method: string, body?: unknown) => () =>
    fetch(url, {
      method,
      ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
    });

  const patchReview = (id: string, change: (r: Review) => Review) => (list: Review[]) =>
    list.map((r) => (r.id === id ? change(r) : r));

  const patchReply = (reviewId: string, replyId: string, change: (r: ReviewReply) => ReviewReply | null) =>
    patchReview(reviewId, (r) => ({
      ...r,
      replies: (r.replies ?? []).flatMap((reply) => (reply.id === replyId ? (change(reply) ?? []) : [reply])),
    }));

  const actions = {
    setStatus: (id: string, status: ReviewStatus) =>
      mutate(patchReview(id, (r) => ({ ...r, status })), send(`/api/admin/reviews/${id}`, "PATCH", { status }), "Could not update the review."),

    remove: (id: string) =>
      mutate((list) => list.filter((r) => r.id !== id), send(`/api/admin/reviews/${id}`, "DELETE"), "Could not delete the review."),

    setReplyStatus: (id: string, replyId: string, status: ReviewStatus) =>
      mutate(
        patchReply(id, replyId, (reply) => ({ ...reply, status })),
        send(`/api/admin/reviews/${id}/replies/${replyId}`, "PATCH", { status }),
        "Could not update the reply.",
      ),

    removeReply: (id: string, replyId: string) =>
      mutate(patchReply(id, replyId, () => null), send(`/api/admin/reviews/${id}/replies/${replyId}`, "DELETE"), "Could not delete the reply."),

    removeImage: (id: string, replyId: string | undefined, attachmentId: string) => {
      const strip = (items?: ReviewAttachment[]) => items?.filter((a) => a.id !== attachmentId);
      const apply = replyId
        ? patchReply(id, replyId, (reply) => ({ ...reply, attachments: strip(reply.attachments) }))
        : patchReview(id, (r) => ({ ...r, attachments: strip(r.attachments) }));
      const query = replyId ? `?replyId=${encodeURIComponent(replyId)}` : "";
      return mutate(apply, send(`/api/admin/reviews/${id}/attachments/${attachmentId}${query}`, "DELETE"), "Could not remove the image.");
    },

    ownerReply: async (id: string, text: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/reviews/${id}/replies`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = (await res.json().catch(() => null)) as { reply?: ReviewReply; error?: string } | null;
        if (!res.ok || !data?.reply) throw new Error(data?.error || "Could not post the reply.");
        const reply = data.reply;
        setReviews(patchReview(id, (r) => ({ ...r, replies: [...(r.replies ?? []), reply] })));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not post the reply.");
        return false;
      }
    },
  };

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index + 1) % TABS.length
      : event.key === "ArrowLeft" ? (index + last) % TABS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setFilter(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter reviews"
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab, index) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`reviews-tab-${tab.id}`}
              aria-selected={active}
              aria-controls="reviews-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setFilter(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-[border-color,color,background-color] duration-200",
                active
                  ? "border-line/15 bg-white/[0.08] text-ink"
                  : "border-transparent text-fog/65 hover:text-ink",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "min-w-5 tabular-nums",
                  tab.id === "pending" && counts.pending > 0 ? "text-ink" : "text-fog/70",
                )}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "review" : "reviews"} shown
      </p>

      {error ? (
        <div role="alert" className="mt-4 flex items-center justify-between gap-4 border border-red-300/30 bg-red-300/[0.06] px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-[11px] tracking-[0.22em] hover:text-ink">
            DISMISS
          </button>
        </div>
      ) : null}

      <div id="reviews-panel" role="tabpanel" aria-labelledby={`reviews-tab-${filter}`} tabIndex={-1} className="mt-6 outline-none">
        {visible.length ? (
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {visible.map((review, index) => (
                <motion.li
                  key={review.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: reduceMotion ? 0 : Math.min(index, 8) * 0.04 }}
                >
                  <ReviewCard
                    review={review}
                    actions={actions}
                    onOpenImages={(images, at) => setViewer({ images, index: at })}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div className="rounded-2xl border border-line/10 bg-void/25 px-5 py-10 text-sm text-fog/70">
            {filter === "all" ? "No reviews yet." : `Nothing ${filter === "pending" ? "waiting for approval" : filter}.`}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewer ? (
          <Lightbox
            images={viewer.images}
            index={viewer.index}
            onIndex={(index) => setViewer({ ...viewer, index })}
            onClose={() => setViewer(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
