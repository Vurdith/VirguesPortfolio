"use client";

import * as React from "react";

import type { Review, ReviewAttachment, ReviewReply, ReviewStatus } from "@/types/portfolio";
import { Stars } from "@/components/Stars";
import { cn } from "@/lib/cn";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";

export type ReviewActions = {
  setStatus: (id: string, status: ReviewStatus) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  setReplyStatus: (id: string, replyId: string, status: ReviewStatus) => Promise<boolean>;
  removeReply: (id: string, replyId: string) => Promise<boolean>;
  removeImage: (id: string, replyId: string | undefined, attachmentId: string) => Promise<boolean>;
  ownerReply: (id: string, text: string) => Promise<boolean>;
};

export const hasPendingReplies = (review: Review) =>
  (review.replies ?? []).some((reply) => reply.status === "pending");

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

export function ReviewCard({
  review,
  actions,
  onOpenImages,
}: {
  review: Review;
  actions: ReviewActions;
  onOpenImages: (images: ReviewAttachment[], index: number) => void;
}) {
  const replies = review.replies ?? [];
  const waiting = replies.filter((reply) => reply.status === "pending").length;
  const [open, setOpen] = React.useState(waiting > 0);
  const [busy, setBusy] = React.useState(false);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const confirmThen = (message: string, task: () => Promise<unknown>) => {
    if (window.confirm(message)) void run(task);
  };

  return (
    <article
      aria-label={`Review by ${review.name}`}
      className={cn(
        "border bg-void/25 transition-colors duration-200 hover:border-line/25",
        review.status === "pending" ? "border-ink/30" : "border-line/10",
      )}
    >
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="font-serif text-xl leading-none tracking-[-0.03em]">{review.name}</h2>
            <Stars rating={review.rating} glyph="★" />
            <StatusBadge status={review.status} />
            {waiting ? <Badge tone="alert">{waiting} {waiting === 1 ? "REPLY" : "REPLIES"} WAITING</Badge> : null}
            <time dateTime={review.createdAt} className="text-[11px] tracking-[0.22em] text-fog/70">
              {date(review.createdAt)}
            </time>
          </div>

          <p className="mt-4 max-w-prose whitespace-pre-line text-pretty text-sm leading-relaxed text-fog/85">{review.text}</p>

          <AdminImages
            className="mt-4"
            images={review.attachments ?? []}
            disabled={busy}
            onOpen={(index) => onOpenImages(review.attachments ?? [], index)}
            onRemove={(image) =>
              confirmThen("Remove this image? The file is deleted.", () => actions.removeImage(review.id, undefined, image.id))
            }
          />
        </div>

        <div className="flex flex-wrap items-start gap-2 md:w-36 md:flex-col md:items-stretch">
          <ActionButton
            label="APPROVE"
            disabled={busy || review.status === "approved"}
            primary={review.status !== "approved"}
            onClick={() => void run(() => actions.setStatus(review.id, "approved"))}
          />
          <ActionButton
            label="REJECT"
            disabled={busy || review.status === "rejected"}
            onClick={() => void run(() => actions.setStatus(review.id, "rejected"))}
          />
          <ActionButton
            label="DELETE"
            danger
            disabled={busy}
            onClick={() => confirmThen("Delete this review and its replies? This cannot be undone.", () => actions.remove(review.id))}
          />
        </div>
      </div>

      <div className="border-t border-line/10">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`thread-${review.id}`}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left text-[11px] tracking-[0.22em] text-fog/72 transition-colors hover:bg-white/[0.025] hover:text-ink"
        >
          <span>
            THREAD <span className="text-fog/45">/</span> {replies.length} {replies.length === 1 ? "REPLY" : "REPLIES"}
          </span>
          <span aria-hidden="true" className={cn("transition-transform duration-200", open && "rotate-45")}>
            +
          </span>
        </button>

        {open ? (
          <div id={`thread-${review.id}`} className="space-y-5 border-t border-line/10 px-5 py-5">
            {replies.length ? (
              <ol className="space-y-5 border-l border-line/10 pl-5">
                {replies.map((reply) => (
                  <ReplyRow
                    key={reply.id}
                    reply={reply}
                    clientName={review.name}
                    disabled={busy}
                    onOpenImages={onOpenImages}
                    onStatus={(status) => void run(() => actions.setReplyStatus(review.id, reply.id, status))}
                    onDelete={() => confirmThen("Delete this reply? This cannot be undone.", () => actions.removeReply(review.id, reply.id))}
                    onRemoveImage={(image) =>
                      confirmThen("Remove this image? The file is deleted.", () => actions.removeImage(review.id, reply.id, image.id))
                    }
                  />
                ))}
              </ol>
            ) : (
              <p className="text-sm text-fog/70">No replies yet.</p>
            )}

            <OwnerComposer
              reviewId={review.id}
              visible={review.status === "approved"}
              onSend={(text) => actions.ownerReply(review.id, text)}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ReplyRow({
  reply,
  clientName,
  disabled,
  onOpenImages,
  onStatus,
  onDelete,
  onRemoveImage,
}: {
  reply: ReviewReply;
  clientName: string;
  disabled: boolean;
  onOpenImages: (images: ReviewAttachment[], index: number) => void;
  onStatus: (status: ReviewStatus) => void;
  onDelete: () => void;
  onRemoveImage: (image: ReviewAttachment) => void;
}) {
  const owner = reply.author === "owner";
  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className={cn("absolute -left-[1.6rem] top-1.5 size-2 border", owner ? "border-ink bg-ink" : "border-line/40 bg-void")}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink/90">{owner ? "You" : clientName}</span>
        {owner ? <Badge tone="owner">OWNER</Badge> : null}
        {owner && reply.status === "approved" ? null : <StatusBadge status={reply.status} />}
        <time dateTime={reply.createdAt} className="text-[11px] tracking-[0.18em] text-fog/70">
          {date(reply.createdAt)}
        </time>
      </div>
      <p className="mt-2 max-w-prose whitespace-pre-line text-pretty text-sm leading-relaxed text-fog/85">{reply.text}</p>
      <AdminImages
        className="mt-3"
        images={reply.attachments ?? []}
        disabled={disabled}
        onOpen={(index) => onOpenImages(reply.attachments ?? [], index)}
        onRemove={onRemoveImage}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {owner ? null : (
          <>
            <ActionButton small label="APPROVE" primary={reply.status !== "approved"} disabled={disabled || reply.status === "approved"} onClick={() => onStatus("approved")} />
            <ActionButton small label="REJECT" disabled={disabled || reply.status === "rejected"} onClick={() => onStatus("rejected")} />
          </>
        )}
        <ActionButton small danger label="DELETE" disabled={disabled} onClick={onDelete} />
      </div>
    </li>
  );
}

function OwnerComposer({
  reviewId,
  visible,
  onSend,
}: {
  reviewId: string;
  visible: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const length = text.trim().length;
  const ready = length >= REVIEW_LIMITS.reply.min;

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    const ok = await onSend(text.trim());
    setSending(false);
    if (ok) setText("");
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor={`owner-reply-${reviewId}`} className="text-[11px] tracking-[0.22em] text-fog/72">
        REPLY AS OWNER
      </label>
      <textarea
        id={`owner-reply-${reviewId}`}
        value={text}
        maxLength={REVIEW_LIMITS.reply.max}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
        }}
        placeholder="Write back to this reviewer"
        className="mt-2 h-20 w-full resize-none rounded-xl border border-line/15 bg-void/35 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/50 focus:border-ink/60"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fog/70">
          {visible ? "Public straight away, marked OWNER." : "Shown on the site once the review is approved."}{" "}
          <span className="tabular-nums">
            {length}/{REVIEW_LIMITS.reply.max}
          </span>
        </p>
        <ActionButton label={sending ? "POSTING…" : "POST REPLY"} primary submit disabled={!ready || sending} />
      </div>
    </form>
  );
}

function AdminImages({
  images,
  disabled,
  className,
  onOpen,
  onRemove,
}: {
  images: ReviewAttachment[];
  disabled: boolean;
  className?: string;
  onOpen: (index: number) => void;
  onRemove: (image: ReviewAttachment) => void;
}) {
  if (!images.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {images.map((image, index) => (
        <li key={image.id} className="group relative size-24 rounded-xl border border-line/15 bg-void/50">
          <button
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`View image ${index + 1} of ${images.length}`}
            className="block size-full overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(image)}
            aria-label={`Remove image ${index + 1}`}
            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full border border-line/25 bg-black/75 text-sm leading-none text-ink opacity-70 transition-opacity hover:border-ink/70 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "alert" | "owner" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] tracking-[0.1em]",
        tone === "alert" && "border-ink/60 bg-white/[0.08] text-ink",
        tone === "owner" && "border-ink/70 text-ink",
        !tone && "border-line/10 bg-void/35 text-fog/70",
      )}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge tone={status === "pending" ? "alert" : undefined}>{status.toUpperCase()}</Badge>;
}

function ActionButton({
  label,
  disabled,
  danger,
  primary,
  small,
  submit,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
  small?: boolean;
  submit?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center border text-[11px] tracking-[0.22em] transition-[border-color,color,background-color,transform,opacity] duration-200",
        "hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40",
        small ? "h-8 px-3" : "h-10 px-4",
        primary ? "border-ink bg-ink font-medium text-void hover:bg-white" : "border-line/15 bg-void/35 text-fog/72 hover:border-line/35 hover:text-ink",
        danger && !primary && "hover:border-red-300/50 hover:text-red-200",
      )}
    >
      {label}
    </button>
  );
}
