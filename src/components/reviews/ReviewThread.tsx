"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { PublicReview, ReviewAttachment } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { Stars } from "@/components/Stars";
import { TurnstileWidget, turnstileConfigured } from "@/components/TurnstileWidget";
import { useDialog } from "@/hooks/useDialog";
import { useUiSounds } from "@/hooks/useUiSounds";
import { cn } from "@/lib/cn";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";
import { SITE } from "@/lib/site";

import { AttachmentPicker, useAttachments } from "./AttachmentPicker";
import { AttachmentGrid, Lightbox } from "./Lightbox";
import { EASE, FIELD, FieldError, LABEL } from "./ReviewModal";
import { formatDate, getThreadToken } from "./reviewClient";

type Viewer = { images: ReviewAttachment[]; index: number } | null;

/** A review opened in full, with its attachments and the conversation under it. */
export function ReviewThread({ review: initial, onClose }: { review: PublicReview; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const { playClose } = useUiSounds();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const [review, setReview] = React.useState(initial);
  const [token, setToken] = React.useState<string | null>(null);
  const [viewer, setViewer] = React.useState<Viewer>(null);

  const close = React.useCallback(() => {
    playClose();
    onClose();
  }, [onClose, playClose]);
  useDialog(panelRef, close, closeRef);

  // The page is cached, so fetch the live thread; the reviewer's token also reveals their waiting replies.
  const refresh = React.useCallback(
    async (own: string | null) => {
      try {
        const res = await fetch(`/api/reviews/${initial.id}`, {
          cache: "no-store",
          headers: own ? { "x-thread-token": own } : {},
        });
        if (res.ok) setReview(((await res.json()) as { review: PublicReview }).review);
      } catch {
        // Keep showing what the page already had.
      }
    },
    [initial.id],
  );

  React.useEffect(() => {
    const own = getThreadToken(initial.id);
    setToken(own);
    void refresh(own);
  }, [initial.id, refresh]);

  const entries = review.replies;
  const slide = reduceMotion ? 0 : 24;
  const fade = { duration: reduceMotion ? 0 : 0.35, ease: EASE };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thread-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close thread"
        className="absolute inset-0 cursor-default bg-black/75"
        data-sound="off"
        onClick={close}
      />

      <motion.div
        ref={panelRef}
        initial={{ x: slide, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slide, opacity: 0 }}
        transition={fade}
        className="relative flex h-dvh w-full flex-col border-line/18 bg-[#0c0c0d] shadow-2xl md:max-w-xl md:border-l"
      >
        <header className="flex shrink-0 items-start justify-between gap-6 border-b border-line/10 px-5 py-5 md:px-8">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.22em] text-fog/70">
              THREAD <span className="text-fog/45">/</span> {entries.length + 1}
            </p>
            <h3 id="thread-title" className="mt-2 truncate font-serif text-3xl leading-[0.95] tracking-[-0.05em]">
              {review.name}
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            data-sound="off"
            onClick={close}
            className="relative inline-flex size-11 shrink-0 items-center justify-center border border-line/18 bg-void/40 text-xl leading-none text-fog/70 transition-colors hover:border-line/35 hover:text-ink"
            aria-label="Close"
          >
            ×
            <CornerMarks className="opacity-80" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
          <article>
            <div className="flex items-center justify-between gap-4">
              <Stars rating={review.rating} className="[&>span]:text-base" />
              <time dateTime={review.createdAt} className="text-[11px] tracking-[0.22em] text-fog/70">
                {formatDate(review.createdAt)}
              </time>
            </div>
            <p className="mt-4 whitespace-pre-line text-pretty text-base leading-relaxed text-ink/90">{review.text}</p>
            <AttachmentGrid
              className="mt-5"
              images={review.attachments ?? []}
              onOpen={(index) => setViewer({ images: review.attachments ?? [], index })}
            />
          </article>

          <div className="mt-8 flex items-center gap-4 text-[11px] tracking-[0.22em] text-fog/72">
            <span>REPLIES</span>
            <span className="h-px flex-1 bg-line/10" />
            <span className="tabular-nums">{entries.length}</span>
          </div>

          {entries.length ? (
            <ol className="mt-6 space-y-6 border-l border-line/12 pl-5">
              {entries.map((reply, index) => (
                <motion.li
                  key={reply.id}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE, delay: reduceMotion ? 0 : Math.min(index, 6) * 0.06 }}
                  className="relative"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[1.6rem] top-1.5 size-2 border",
                      reply.author === "owner" ? "border-ink bg-ink" : "border-line/40 bg-void",
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink/90">
                      {reply.author === "owner" ? SITE.name : review.name}
                    </span>
                    {reply.author === "owner" ? (
                      <span className="border border-ink/70 px-1.5 py-0.5 text-[10px] tracking-[0.22em] text-ink">OWNER</span>
                    ) : null}
                    {reply.pending ? (
                      <span className="border border-line/20 px-1.5 py-0.5 text-[10px] tracking-[0.22em] text-fog/80">
                        AWAITING APPROVAL
                      </span>
                    ) : null}
                    <time dateTime={reply.createdAt} className="text-[11px] tracking-[0.18em] text-fog/70">
                      {formatDate(reply.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-pretty text-sm leading-relaxed text-fog/90">{reply.text}</p>
                  <AttachmentGrid
                    className="mt-3"
                    images={reply.attachments ?? []}
                    onOpen={(i) => setViewer({ images: reply.attachments ?? [], index: i })}
                  />
                </motion.li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-sm text-fog/70">No replies yet.</p>
          )}
        </div>

        {token ? (
          <ReplyComposer reviewId={review.id} token={token} onSent={() => refresh(token)} onRejectedToken={() => setToken(null)} />
        ) : (
          <p className="shrink-0 border-t border-line/10 px-5 py-4 text-xs leading-relaxed text-fog/70 md:px-8">
            Only the person who wrote this review can reply here, from the browser they submitted it with.
          </p>
        )}
      </motion.div>

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
    </motion.div>,
    document.body,
  );
}

function ReplyComposer({
  reviewId,
  token,
  onSent,
  onRejectedToken,
}: {
  reviewId: string;
  token: string;
  onSent: () => Promise<void>;
  onRejectedToken: () => void;
}) {
  const attachments = useAttachments();
  const [text, setText] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [attempted, setAttempted] = React.useState(false);
  const [state, setState] = React.useState<{ kind: "idle" | "sending" | "sent" | "error"; message?: string }>({ kind: "idle" });
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const textRef = React.useRef<HTMLTextAreaElement>(null);

  const length = text.trim().length;
  const tooShort = length < REVIEW_LIMITS.reply.min;
  const busy = state.kind === "sending" || attachments.uploading;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setAttempted(true);
    if (tooShort) return;
    if (attachments.failed) {
      setState({ kind: "error", message: "Remove the image that failed to upload, or try it again." });
      return;
    }
    if (turnstileConfigured && !turnstileToken) {
      setState({ kind: "error", message: "Please complete the human check first." });
      return;
    }

    setState({ kind: "sending" });
    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          token,
          company,
          attachments: attachments.ids,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.status === 403) onRejectedToken();
      if (!res.ok) throw new Error(data?.error || `Something went wrong (${res.status}). Try again.`);

      setText("");
      setAttempted(false);
      attachments.reset();
      setState({ kind: "sent", message: "Reply sent. It will appear once approved." });
      setOpen(false);
      await onSent();
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Could not send. Try again." });
    }
  };

  const error = attempted && tooShort ? "Write a reply first." : undefined;

  if (!open) {
    return (
      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
        <p className="min-w-0 text-xs text-fog/70" role="status">
          {state.message ?? "You wrote this review, so you can reply."}
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            window.setTimeout(() => textRef.current?.focus(), 0);
          }}
          className="inline-flex shrink-0 items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink transition-colors hover:border-line/40"
        >
          WRITE A REPLY <span aria-hidden="true">+</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate className="max-h-[70dvh] shrink-0 space-y-4 overflow-y-auto border-t border-line/10 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-8">
      <div>
        <label htmlFor="thread-reply" className={LABEL}>
          REPLY
        </label>
        <textarea
          id="thread-reply"
          ref={textRef}
          value={text}
          maxLength={REVIEW_LIMITS.reply.max}
          onChange={(event) => {
            setText(event.target.value);
            if (state.kind !== "idle") setState({ kind: "idle" });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Add to the conversation"
          aria-invalid={Boolean(error)}
          aria-describedby={cn("thread-reply-count", error && "thread-reply-error")}
          className={cn(FIELD, "h-24 resize-none", error ? "border-red-300/60" : "border-line/14")}
        />
        <div className="mt-1.5 flex items-start justify-between gap-4 text-xs">
          <FieldError id="thread-reply-error" message={error} inline />
          <span id="thread-reply-count" className="ml-auto shrink-0 tabular-nums text-fog/70">
            {length}/{REVIEW_LIMITS.reply.max}
          </span>
        </div>
      </div>

      <AttachmentPicker controller={attachments} disabled={state.kind === "sending"} />

      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
      </div>

      <TurnstileWidget onToken={setTurnstileToken} />

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] tracking-[0.22em] text-fog/72 underline-offset-4 hover:text-ink hover:underline"
        >
          CANCEL
        </button>
        <p
          className={cn("min-w-0 flex-1 text-right text-xs", state.kind === "error" ? "text-red-200" : "text-fog/70")}
          role={state.kind === "error" ? "alert" : "status"}
        >
          {state.message ?? (attachments.uploading ? "Uploading images…" : "Replies are shown after approval.")}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-3 border border-ink bg-ink px-5 py-3 text-xs font-medium tracking-[0.22em] text-void transition-[transform,opacity] duration-300 hover:-translate-y-px active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
        >
          <span>{state.kind === "sending" ? "SENDING…" : "REPLY"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
