"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

import { CornerMarks } from "@/components/CornerMarks";
import { TurnstileWidget, turnstileConfigured } from "@/components/TurnstileWidget";
import { prepareImage, uploadImage } from "@/components/reviews/reviewClient";
import { useDialog } from "@/hooks/useDialog";
import { useUiSounds } from "@/hooks/useUiSounds";
import { cn } from "@/lib/cn";
import { CHAT_LIMITS } from "@/lib/chat/limits";
import type { ChatView } from "@/lib/chat/session";
import { SITE } from "@/lib/site";

const EASE = [0.22, 1, 0.36, 1] as const;
type Message = NonNullable<ChatView["thread"]>["messages"][number];
type Draft = {
  key: string;
  preview: string;
  status: "uploading" | "done" | "error";
  id?: string;
  error?: string;
};

const readJson = async <T,>(res: Response) => (await res.json().catch(() => null)) as (T & { error?: string }) | null;

/** "about 40 minutes" / "about 2 minutes", for cooldown and lock messages. */
const minutes = (value: number) => `${value} minute${value === 1 ? "" : "s"}`;

export function BriefChat({ onClose }: { onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const { playClose } = useUiSounds();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [view, setView] = React.useState<ChatView | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [pending, setPending] = React.useState<Message | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  const close = React.useCallback(() => {
    playClose();
    onClose();
  }, [onClose, playClose]);
  useDialog(panelRef, close);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/chat", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<ChatView>) : Promise.reject(new Error())))
      .then((data) => !cancelled && setView(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const messages = React.useMemo(() => [...(view?.thread?.messages ?? []), ...(pending ? [pending] : [])], [view, pending]);
  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages.length, sending, reduceMotion]);

  const start = async () => {
    if (starting) return;
    if (turnstileConfigured && !turnstileToken) {
      setError("Please complete the human check first.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(turnstileToken ? { turnstileToken } : {}),
      });
      const data = await readJson<ChatView>(res);
      if (data?.state) setView(data as ChatView);
      if (!res.ok) setError(data?.error ?? "Could not start the conversation.");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setStarting(false);
    }
  };

  const attach = async (files: File[]) => {
    const room = Math.min(
      CHAT_LIMITS.imagesPerMessage - drafts.length,
      (view?.thread?.imagesLeft ?? 0) - drafts.length,
    );
    if (room <= 0) {
      setError(
        (view?.thread?.imagesLeft ?? 0) - drafts.length <= 0
          ? "You've used all the image slots for this chat."
          : `Up to ${CHAT_LIMITS.imagesPerMessage} images per message.`,
      );
      return;
    }
    setError(null);

    for (const original of files.slice(0, room)) {
      const prepared = await prepareImage(original);
      if ("error" in prepared) {
        setError(`${original.name}: ${prepared.error}`);
        continue;
      }
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const draft: Draft = { key, preview: URL.createObjectURL(prepared.file), status: "uploading" };
      setDrafts((current) => [...current, draft]);
      uploadImage(prepared.file, () => undefined, new AbortController().signal, "/api/chat/upload")
        .then((uploaded) =>
          setDrafts((current) => current.map((item) => (item.key === key ? { ...item, status: "done", id: uploaded.id } : item))),
        )
        .catch((err: unknown) =>
          setDrafts((current) =>
            current.map((item) =>
              item.key === key ? { ...item, status: "error", error: err instanceof Error ? err.message : "Upload failed." } : item,
            ),
          ),
        );
    }
  };

  const removeDraft = (key: string) =>
    setDrafts((current) => {
      const gone = current.find((item) => item.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return current.filter((item) => item.key !== key);
    });

  const uploading = drafts.some((draft) => draft.status === "uploading");
  const failed = drafts.some((draft) => draft.status === "error");

  const send = async () => {
    const content = text.trim();
    const images = drafts.flatMap((draft) => (draft.status === "done" && draft.id ? [draft.id] : []));
    if (sending || uploading || (!content && !images.length)) return;
    if (failed) {
      setError("Remove the image that failed to upload, or try it again.");
      return;
    }

    setSending(true);
    setError(null);
    const temp: Message = {
      id: "pending",
      role: "user",
      content,
      images: drafts.filter((draft) => draft.id).map((draft) => ({ id: draft.id as string, url: draft.preview })),
      at: new Date().toISOString(),
    };
    setPending(temp);
    setText("");

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: content, images }),
      });
      const data = await readJson<ChatView>(res);
      if (!res.ok || !data?.thread) {
        // Nothing was added to the conversation: give the customer their message back.
        setText(content);
        setError(data?.error ?? "Something went wrong. Try again.");
        if (data?.state && data.thread) setView(data as ChatView);
        return;
      }
      setView(data as ChatView);
      drafts.forEach((draft) => URL.revokeObjectURL(draft.preview));
      setDrafts([]);
    } catch {
      setText(content);
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(null);
      setSending(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const fade = { duration: reduceMotion ? 0 : 0.3, ease: EASE };
  const thread = view?.thread ?? null;
  const open = view?.state === "open" && thread && !thread.ended;
  const unavailable = loadError || (view && !view.enabled);
  const busyEnough = text.length > CHAT_LIMITS.messageChars - 150;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
    >
      <button type="button" tabIndex={-1} aria-label="Close chat" className="absolute inset-0 cursor-default bg-black/75" data-sound="off" onClick={close} />

      <motion.div
        ref={panelRef}
        initial={{ y: reduceMotion ? 0 : 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: reduceMotion ? 0 : 24, opacity: 0 }}
        transition={fade}
        className={cn(
          "relative flex h-dvh w-full flex-col border-line/18 bg-[#0c0c0d] shadow-2xl md:max-w-2xl md:border",
          thread ? "md:h-[min(92dvh,760px)]" : "md:h-auto md:max-h-[92dvh]",
        )}
      >
        <CornerMarks className="hidden opacity-80 md:block" />

        <header className="flex shrink-0 items-start justify-between gap-6 border-b border-line/10 px-5 py-5 md:px-8">
          <div>
            <p className="text-xs tracking-[0.22em] text-fog/70">AI ASSISTANT</p>
            <h3 id="brief-title" className="mt-2 font-serif text-3xl leading-[0.95] tracking-[-0.05em]">
              Brief your project.
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

        {unavailable ? (
          <Notice title="The assistant is offline right now.">
            Use the quote form below, or email <a className="underline underline-offset-4" href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </Notice>
        ) : !view ? (
          <div className="grid flex-1 place-items-center text-xs tracking-[0.22em] text-fog/60" aria-live="polite">
            LOADING
          </div>
        ) : view.state === "locked" ? (
          <Notice title="A conversation is already open from this connection.">
            Only one chat can run at a time per connection. Try again in about {minutes(view.retryAfterMinutes)}, or use the quote form.
          </Notice>
        ) : view.state === "cooldown" && !thread ? (
          <Notice title="You have just finished a conversation.">
            To keep the assistant fair for everyone, the next chat opens in about {minutes(view.retryAfterMinutes)}. The quote form is always available.
          </Notice>
        ) : view.state === "none" ? (
          <div className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto px-5 py-8 md:px-8">
            <div className="space-y-5 text-sm leading-relaxed text-fog/80">
              <p>
                Tell an AI assistant what you need: the screens, the style, your references. It asks questions until the brief is clear, then
                sends everything to {SITE.name}, who replies to you personally.
              </p>
              <ul className="space-y-2 text-fog/70">
                <li>— Attach reference images and say what to take from them.</li>
                <li>— You get a price per frame as you go. {SITE.name} confirms the final price.</li>
                <li>— One conversation at a time, then a short break before the next.</li>
              </ul>
            </div>
            <div className="mt-8">
              {turnstileConfigured ? <TurnstileWidget onToken={setTurnstileToken} /> : null}
              <button
                type="button"
                onClick={() => void start()}
                disabled={starting}
                className="relative mt-3 inline-flex h-12 w-full items-center justify-center border border-line/35 bg-white/[0.04] text-xs tracking-[0.22em] text-ink transition-colors hover:border-line/60 disabled:opacity-60"
              >
                {starting ? "STARTING…" : "START CHAT"}
                <CornerMarks className="opacity-80" />
              </button>
              {error ? (
                <p role="alert" className="mt-3 text-xs text-red-200">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-6 md:px-8" aria-live="polite">
              {messages.map((message) => (
                <Bubble key={message.id} message={message} />
              ))}
              {sending ? <ThinkingBubble reading={Boolean(pending?.images.length)} /> : null}
              {view.state === "cooldown" ? (
                <p className="border border-line/12 bg-void/40 px-4 py-3 text-xs leading-relaxed text-fog/75">
                  Your brief is with {SITE.name}. You can start another chat in about {minutes(view.retryAfterMinutes)}.
                </p>
              ) : null}
            </div>

            {open ? (
              <div className="shrink-0 border-t border-line/10 px-5 pb-5 pt-4 md:px-8">
                {drafts.length ? (
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {drafts.map((draft) => (
                      <li key={draft.key} className="group relative size-14 overflow-hidden border border-line/18">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={draft.preview} alt="Attached reference" className={cn("size-full object-cover", draft.status !== "done" && "opacity-50")} />
                        {draft.status === "error" ? (
                          <span className="absolute inset-0 grid place-items-center bg-black/70 p-1 text-center text-[9px] leading-tight text-red-200" role="alert">
                            {draft.error}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          data-sound="off"
                          onClick={() => removeDraft(draft.key)}
                          aria-label="Remove image"
                          className="absolute right-0.5 top-0.5 grid size-5 place-items-center bg-black/70 text-xs leading-none text-ink"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    data-sound="off"
                    onClick={() => fileRef.current?.click()}
                    disabled={sending || (thread?.imagesLeft ?? 0) <= drafts.length}
                    aria-label="Attach reference images"
                    title="Attach reference images"
                    className="inline-flex size-12 shrink-0 items-center justify-center border border-line/18 bg-void/40 text-fog/70 transition-colors hover:border-line/35 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m21 11-8.6 8.6a5 5 0 0 1-7-7l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.7 8.6a1.7 1.7 0 0 1-2.3-2.4l7.9-7.9" />
                    </svg>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    hidden
                    onChange={(event) => {
                      if (event.target.files?.length) void attach(Array.from(event.target.files));
                      event.target.value = "";
                    }}
                  />
                  <textarea
                    ref={inputRef}
                    value={text}
                    rows={2}
                    maxLength={CHAT_LIMITS.messageChars}
                    placeholder="Type your message"
                    aria-label="Your message"
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    className="max-h-40 min-h-12 w-full resize-none border border-line/14 bg-void/35 px-4 py-3 text-base text-ink outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-fog/50 focus:border-ink/70 focus:shadow-[0_0_0_4px_rgb(255_255_255/0.06)] md:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={sending || uploading || (!text.trim() && !drafts.some((draft) => draft.id))}
                    className="relative inline-flex h-12 shrink-0 items-center justify-center border border-line/35 bg-white/[0.04] px-5 text-xs tracking-[0.22em] text-ink transition-colors hover:border-line/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    SEND
                  </button>
                </div>
                <p className={cn("mt-2 text-xs", error ? "text-red-200" : "text-fog/60")} role={error ? "alert" : undefined}>
                  {error ??
                    (busyEnough
                      ? `${CHAT_LIMITS.messageChars - text.length} characters left`
                      : (thread?.messagesLeft ?? 0) <= 5
                        ? `${thread?.messagesLeft} messages left in this chat`
                        : "Enter to send, Shift+Enter for a new line. AI assistant: prices are guides, final price confirmed by Virguê.")}
                </p>
              </div>
            ) : null}
          </>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Words and orb animations the assistant cycles through while it works on a reply. */
const THINKING: { state: OrbState; label: string }[] = [
  { state: "working", label: "Thinking…" },
  { state: "solving", label: "Working through the details…" },
  { state: "weaving", label: "Connecting your ideas…" },
  { state: "composing", label: "Drafting a reply…" },
];
const READING = { state: "searching" as OrbState, label: "Studying your references…" };

function ThinkingBubble({ reading }: { reading: boolean }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => current + 1), 2600);
    return () => window.clearInterval(timer);
  }, []);

  // Messages with images start by reading them, then move on to the usual sequence.
  const current = reading && step === 0 ? READING : THINKING[(reading ? step - 1 : step) % THINKING.length] ?? THINKING[0];

  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className="inline-flex items-center gap-2.5 rounded-full border border-line/14 bg-void/50 py-2 pl-2.5 pr-4 text-xs text-fog/80">
        <ThinkingOrb state={current.state} size={20} theme="dark" aria-label={current.label} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current.label}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 md:px-8">
      <p className="font-serif text-2xl leading-tight tracking-[-0.04em]">{title}</p>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-fog/75">{children}</p>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] whitespace-pre-wrap text-pretty border px-4 py-3 text-sm leading-relaxed",
          mine ? "border-line/30 bg-white/[0.05] text-ink" : "border-line/10 bg-void/40 text-fog/85",
        )}
      >
        {message.content}
        {message.images.length ? (
          <span className="mt-2 flex flex-wrap gap-2">
            {message.images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image.id} src={image.url} alt="Reference you attached" className="size-20 border border-line/15 object-cover" loading="lazy" />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
