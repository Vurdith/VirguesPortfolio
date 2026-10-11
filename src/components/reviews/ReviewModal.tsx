"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { TurnstileWidget, turnstileConfigured } from "@/components/TurnstileWidget";
import { useDialog } from "@/hooks/useDialog";
import { useUiSounds } from "@/hooks/useUiSounds";
import { cn } from "@/lib/cn";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";

import { AttachmentPicker, useAttachments } from "./AttachmentPicker";
import { saveThreadToken } from "./reviewClient";
import { StarRating } from "./StarRating";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const LABEL = "text-[11px] tracking-[0.22em] text-fog/72";
export const FIELD =
  "mt-2 w-full border bg-void/35 px-4 py-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-fog/50 focus:border-ink/70 focus:shadow-[0_0_0_4px_rgb(255_255_255/0.06)] md:text-sm";

type Status = "idle" | "submitting" | "sent" | "error";
type Errors = { name?: string; rating?: string; text?: string };

function validate(name: string, rating: number, text: string): Errors {
  const errors: Errors = {};
  if (name.trim().length < REVIEW_LIMITS.name.min) errors.name = "Add your name.";
  if (!rating) errors.rating = "Choose a rating.";
  const length = text.trim().length;
  if (length < REVIEW_LIMITS.text.min) {
    errors.text = length
      ? `A little more, please: ${REVIEW_LIMITS.text.min - length} more characters.`
      : "Say a few words about working together.";
  }
  return errors;
}

export function ReviewModal({ onClose }: { onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const { playClose } = useUiSounds();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const attachments = useAttachments();

  const [name, setName] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [attempted, setAttempted] = React.useState(false);
  const [status, setStatus] = React.useState<Status>("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [kept, setKept] = React.useState(true);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  const close = React.useCallback(() => {
    playClose();
    onClose();
  }, [onClose, playClose]);
  useDialog(panelRef, close);

  const errors = validate(name, rating, text);
  const shown = (key: keyof Errors) => (attempted ? errors[key] : undefined);
  const busy = status === "submitting" || attachments.uploading;
  const length = text.trim().length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || status === "sent") return;

    setAttempted(true);
    const firstInvalid = (["name", "rating", "text"] as const).find((key) => errors[key]);
    if (firstInvalid) {
      const selector = firstInvalid === "rating" ? '[data-field="rating"] [tabindex="0"]' : `[data-field="${firstInvalid}"]`;
      panelRef.current?.querySelector<HTMLElement>(selector)?.focus();
      return;
    }
    if (attachments.failed) {
      setStatus("error");
      setServerError("Remove the image that failed to upload, or try it again.");
      return;
    }
    if (turnstileConfigured && !turnstileToken) {
      setStatus("error");
      setServerError("Please complete the human check first.");
      return;
    }

    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          rating,
          text: text.trim(),
          company,
          attachments: attachments.ids,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; token?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || `Something went wrong (${res.status}). Try again.`);

      setKept(data?.id && data.token ? saveThreadToken(data.id, data.token) : false);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Could not send. Try again.");
    }
  };

  const fade = { duration: reduceMotion ? 0 : 0.3, ease: EASE };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close review form"
        className="absolute inset-0 cursor-default bg-black/75"
        data-sound="off"
        onClick={close}
      />

      <motion.div
        ref={panelRef}
        initial={{ y: reduceMotion ? 0 : 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: reduceMotion ? 0 : 24, opacity: 0 }}
        transition={fade}
        className="relative flex h-dvh w-full flex-col border-line/18 bg-[#0c0c0d] shadow-2xl md:h-auto md:max-h-[min(92dvh,860px)] md:max-w-xl md:border"
      >
        <CornerMarks className="hidden opacity-80 md:block" />

        <header className="flex shrink-0 items-start justify-between gap-6 border-b border-line/10 px-5 py-5 md:px-8">
          <div>
            <p className="text-xs tracking-[0.22em] text-fog/70">SUBMISSION</p>
            <h3 id="review-title" className="mt-2 font-serif text-3xl leading-[0.95] tracking-[-0.05em]">
              Leave a review.
            </h3>
          </div>
          <button
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

        {status === "sent" ? (
          <SentState name={name} kept={kept} onClose={close} reduceMotion={Boolean(reduceMotion)} />
        ) : (
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
              <div>
                <label htmlFor="review-name" className={LABEL}>
                  NAME
                </label>
                <input
                  id="review-name"
                  data-field="name"
                  value={name}
                  maxLength={REVIEW_LIMITS.name.max}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  aria-invalid={Boolean(shown("name"))}
                  aria-describedby={shown("name") ? "review-name-error" : undefined}
                  className={cn(FIELD, shown("name") ? "border-red-300/60" : "border-line/14")}
                />
                <FieldError id="review-name-error" message={shown("name")} />
              </div>

              <div>
                <span id="review-rating-label" className={LABEL}>
                  RATING
                </span>
                <div className="mt-2">
                  <StarRating
                    value={rating}
                    onChange={setRating}
                    invalid={Boolean(shown("rating"))}
                    describedBy={shown("rating") ? "review-rating-error" : undefined}
                  />
                </div>
                <FieldError id="review-rating-error" message={shown("rating")} />
              </div>

              <div>
                <label htmlFor="review-text" className={LABEL}>
                  MESSAGE
                </label>
                <textarea
                  id="review-text"
                  data-field="text"
                  value={text}
                  maxLength={REVIEW_LIMITS.text.max}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Keep it short. Keep it real."
                  aria-invalid={Boolean(shown("text"))}
                  aria-describedby={cn("review-text-count", shown("text") && "review-text-error")}
                  className={cn(FIELD, "h-36 resize-none", shown("text") ? "border-red-300/60" : "border-line/14")}
                />
                <div className="mt-1.5 flex items-start justify-between gap-4 text-xs">
                  <FieldError id="review-text-error" message={shown("text")} inline />
                  <span
                    id="review-text-count"
                    className={cn(
                      "ml-auto shrink-0 tabular-nums",
                      length > REVIEW_LIMITS.text.max - 40 ? "text-ink" : "text-fog/70",
                    )}
                  >
                    {length}/{REVIEW_LIMITS.text.max}
                  </span>
                </div>
              </div>

              <AttachmentPicker controller={attachments} disabled={status === "submitting"} />

              {/* Honeypot: invisible to people, tempting to bots. */}
              <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
                <label>
                  Company
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </label>
              </div>

              <TurnstileWidget onToken={setTurnstileToken} />

              <p className="text-xs leading-relaxed text-fog/70">
                Your name, rating, message and images are shown on the site only after I approve them. See
                the{" "}
                <Link href="/privacy" className="text-fog/80 underline underline-offset-4 hover:text-ink">
                  privacy note
                </Link>
                .
              </p>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-line/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
              <p className={cn("min-w-0 text-xs", status === "error" ? "text-red-200" : "text-fog/70")} role={status === "error" ? "alert" : undefined} aria-live="polite">
                {status === "error" ? serverError : attachments.uploading ? "Uploading images…" : "Visible only after approval."}
              </p>
              <button
                type="submit"
                disabled={busy}
                className="relative inline-flex shrink-0 items-center justify-center gap-3 border border-ink bg-ink px-6 py-3.5 text-xs font-medium tracking-[0.22em] text-void transition-[transform,opacity,box-shadow] duration-300 hover:-translate-y-px hover:shadow-[0_8px_28px_rgb(255_255_255/0.16)] active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <span>{status === "submitting" ? "SENDING…" : attachments.uploading ? "UPLOADING…" : "SUBMIT"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </footer>
          </form>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export function FieldError({ id, message, inline }: { id: string; message?: string; inline?: boolean }) {
  if (!message) return inline ? <span /> : null;
  return (
    <motion.p
      key={message}
      id={id}
      role="alert"
      initial={{ x: -6 }}
      animate={{ x: [-6, 6, -4, 4, 0] }}
      transition={{ duration: 0.4 }}
      className={cn("text-xs text-red-200", !inline && "mt-1.5")}
    >
      {message}
    </motion.p>
  );
}

function SentState({
  name,
  kept,
  onClose,
  reduceMotion,
}: {
  name: string;
  kept: boolean;
  onClose: () => void;
  reduceMotion: boolean;
}) {
  const doneRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => doneRef.current?.focus({ preventScroll: true }), []);

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
      className="flex flex-1 flex-col justify-center overflow-y-auto px-5 py-10 md:px-8"
    >
      <svg viewBox="0 0 52 52" className="size-14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <motion.circle
          cx="26"
          cy="26"
          r="23"
          className="text-line/30"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        />
        <motion.path
          d="M15 27l8 8 14-17"
          className="text-ink"
          strokeLinecap="square"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.6, ease: EASE }}
        />
      </svg>
      <p className="mt-6 text-xs tracking-[0.22em] text-fog/72">RECEIVED</p>
      <h3 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em]">
        Got it, {name.trim().split(" ")[0]}.
      </h3>
      <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink/90">Thanks — it&apos;ll appear once approved.</p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-fog/80">
        {kept
          ? "Once it is live you can open it on the site and reply from this browser."
          : "Your browser would not let me remember this review, so you will not be able to reply to it later."}
      </p>
      <button
        ref={doneRef}
        type="button"
        onClick={onClose}
        data-sound="off"
        className="mt-8 self-start border border-line/18 bg-void/40 px-6 py-3.5 text-xs tracking-[0.22em] text-ink transition-colors hover:border-line/40"
      >
        DONE
      </button>
    </motion.div>
  );
}
