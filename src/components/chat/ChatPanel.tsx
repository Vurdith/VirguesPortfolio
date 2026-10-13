"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

import { AgentIcon, OwnerIcon, TypingDots, YouIcon, type AgentMode } from "@/components/chat/Avatars";
import { TurnstileWidget, turnstileConfigured } from "@/components/TurnstileWidget";
import { prepareImage, uploadImage } from "@/components/reviews/reviewClient";
import { cn } from "@/lib/cn";
import { CHAT_LIMITS } from "@/lib/chat/limits";
import type { ChatView } from "@/lib/chat/session";
import { SITE } from "@/lib/site";

type Message = NonNullable<ChatView["thread"]>["messages"][number];
type Draft = {
  key: string;
  preview: string;
  status: "uploading" | "done" | "error";
  id?: string;
  error?: string;
};

const POLL_MS = 3500;

const readJson = async <T,>(res: Response) => (await res.json().catch(() => null)) as (T & { error?: string }) | null;

/** "2 minutes", for cooldown and lock messages. */
const minutes = (value: number) => `${value} minute${value === 1 ? "" : "s"}`;

/** Changes whenever anything the customer would see changes, so polling only re-renders when needed. */
const signature = (view: ChatView) =>
  `${view.state}|${view.thread?.messages.length ?? 0}|${view.thread?.messages.at(-1)?.id ?? ""}|${view.thread?.takeover}|${view.thread?.ended}`;

/**
 * The whole chat: start screen, conversation, composer, and the states around it (cooldown, locked,
 * offline). It fills whatever box it is placed in, so the same component serves every screen size.
 */
export function ChatPanel() {
  const reduceMotion = useReducedMotion();
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

  const sendingRef = React.useRef(false);
  React.useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

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

  // Keep the conversation fresh: the owner may reply at any time. Only while the tab is visible.
  const hasThread = Boolean(view?.thread);
  React.useEffect(() => {
    if (!hasThread) return;
    let stopped = false;
    const poll = async () => {
      if (document.hidden || sendingRef.current) return;
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        if (!res.ok || stopped || sendingRef.current) return;
        const next = (await res.json()) as ChatView;
        setView((current) => (current && signature(current) === signature(next) ? current : next));
      } catch {
        // A missed poll is fine; the next one tries again.
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [hasThread]);

  // The box shrinks back after a message is sent.
  React.useEffect(() => {
    if (!text && inputRef.current) inputRef.current.style.height = "auto";
  }, [text]);

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
    const slotsLeft = (view?.thread?.imagesLeft ?? 0) - drafts.length;
    const room = Math.min(CHAT_LIMITS.imagesPerMessage - drafts.length, slotsLeft);
    if (room <= 0) {
      setError(slotsLeft <= 0 ? "You've used all the image slots for this chat." : `Up to ${CHAT_LIMITS.imagesPerMessage} images per message.`);
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
      setDrafts((current) => [...current, { key, preview: URL.createObjectURL(prepared.file), status: "uploading" }]);
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
    setPending({
      id: "pending",
      role: "user",
      owner: false,
      content,
      images: drafts.filter((draft) => draft.id).map((draft) => ({ id: draft.id as string, url: draft.preview })),
      at: new Date().toISOString(),
    });
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

  const thread = view?.thread ?? null;
  const open = view?.state === "open" && thread && !thread.ended;
  const unavailable = loadError || (view && !view.enabled);
  const nearLimit = text.length > CHAT_LIMITS.messageChars - 150;
  const withOwner = Boolean(thread?.takeover);
  const typing = Boolean(open) && !sending && text.trim().length > 0;
  const agentMode: AgentMode = unavailable || view?.state === "locked" || (view?.state === "cooldown" && !thread) ? "away" : sending && !withOwner ? "thinking" : "idle";
  const header = (
    <header className="flex shrink-0 items-center gap-3 border-b border-line/10 px-3 py-3 md:gap-4 md:px-6 md:py-4">
      <Link
        href="/"
        aria-label={`Back to ${SITE.name}`}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line/18 bg-void/40 pl-3.5 pr-4 text-[11px] tracking-[0.22em] text-fog/85 transition-colors hover:border-line/40 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        BACK
      </Link>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg leading-none tracking-[-0.04em] md:text-2xl">Brief your project.</h1>
        </div>
        {withOwner ? <OwnerIcon size={44} /> : <AgentIcon mode={agentMode} size={44} />}
      </div>
    </header>
  );

  if (unavailable) {
    return (
      <>
        {header}
        <Notice title="The assistant is offline right now.">
          Use the quote form on the home page, or email{" "}
          <a className="underline underline-offset-4" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </Notice>
      </>
    );
  }
  if (!view) {
    return (
      <>
        {header}
        <div className="grid flex-1 place-items-center" aria-live="polite">
          <span className="inline-flex items-center gap-3 text-xs tracking-[0.22em] text-fog/60">
            <TypingDots /> LOADING
          </span>
        </div>
      </>
    );
  }
  if (view.state === "locked") {
    return (
      <>
        {header}
        <Notice title="A conversation is already open from this connection.">
          Only one chat can run at a time per connection. Try again in about {minutes(view.retryAfterMinutes)}, or use the quote form on the home page.
        </Notice>
      </>
    );
  }
  if (view.state === "cooldown" && !thread) {
    return (
      <>
        {header}
        <Notice title="You have just finished a conversation.">
          To keep the assistant fair for everyone, the next chat opens in about {minutes(view.retryAfterMinutes)}. The quote form is always available.
        </Notice>
      </>
    );
  }
  if (view.state === "none") {
    return (
      <>
        {header}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-8 md:px-10 md:py-10">
          <div className="m-auto w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <AgentIcon size={88} />
              <p className="mt-6 font-serif text-3xl leading-[0.95] tracking-[-0.05em] md:text-4xl">Tell me what you need.</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog/80">
                An AI assistant asks a few questions until your brief is clear, then sends it all to {SITE.name}, who replies to you personally.
              </p>
            </div>

            <ol className="mt-8 space-y-3">
              {[
                ["01", "Describe it", "The screens, the style, who it is for."],
                ["02", "Share references", "Attach images and say what to take from them."],
                ["03", "Get a price", `The assistant quotes as you go. ${SITE.name} confirms the final price.`],
              ].map(([n, title, body]) => (
                <li key={n} className="flex items-start gap-4 rounded-2xl border border-line/10 bg-white/[0.02] px-4 py-3.5">
                  <span className="mt-0.5 w-6 shrink-0 font-serif text-lg leading-none tracking-[-0.04em] text-fog/60">{n}</span>
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-fog/70">{body}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-8">
              {turnstileConfigured ? <TurnstileWidget onToken={setTurnstileToken} /> : null}
              <button
                type="button"
                onClick={() => void start()}
                disabled={starting}
                className="group relative mt-3 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-ink text-xs tracking-[0.22em] text-void transition-[transform,opacity] hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {starting ? "STARTING…" : "START CHAT"}
                {starting ? null : (
                  <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-fog/55">One conversation at a time, then a short break before the next.</p>
              {error ? (
                <p role="alert" className="mt-3 text-center text-xs text-red-200">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </>
    );
  }

  const quickStarts = open && !text && !drafts.length && messages.length <= 1 ? STARTERS : [];

  return (
    <>
      {header}
      <div ref={listRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-6 md:px-8" aria-live="polite">
        {messages.map((message, index) => (
          <Bubble key={message.id} message={message} grouped={index > 0 && messages[index - 1]?.role === message.role && messages[index - 1]?.owner === message.owner} />
        ))}
        {sending && !withOwner ? <ThinkingBubble reading={Boolean(pending?.images.length)} /> : null}
        {typing ? (
          <div className="bubble-in flex items-end justify-end gap-2" aria-hidden="true">
            <span className="rounded-2xl rounded-br-md bg-white/[0.06] px-3.5 py-3 text-fog/70">
              <TypingDots />
            </span>
            <YouIcon typing size={28} />
          </div>
        ) : null}
        {withOwner && open ? <Banner>{SITE.name} has joined this chat and will reply personally.</Banner> : null}
        {view.state === "cooldown" ? (
          <Banner>
            Your brief is with {SITE.name}. You can start another chat in about {minutes(view.retryAfterMinutes)}.
          </Banner>
        ) : null}
      </div>

      {open ? (
        <div className="shrink-0 border-t border-line/10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-8 md:pb-5">
          {quickStarts.length ? (
            <div className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" aria-label="Ways to start">
              {quickStarts.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    setText(starter);
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 rounded-full border border-line/18 bg-white/[0.03] px-3.5 py-2 text-xs text-fog/85 transition-colors hover:border-line/40 hover:text-ink"
                >
                  {starter}
                </button>
              ))}
            </div>
          ) : null}

          {drafts.length ? (
            <ul className="mb-3 flex flex-wrap gap-2">
              {drafts.map((draft) => (
                <li key={draft.key} className="relative size-16 overflow-hidden rounded-xl border border-line/18">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.preview} alt="Attached reference" className={cn("size-full object-cover", draft.status !== "done" && "opacity-50")} />
                  {draft.status === "uploading" ? (
                    <span className="absolute inset-0 grid place-items-center">
                      <TypingDots className="text-ink" />
                    </span>
                  ) : null}
                  {draft.status === "error" ? (
                    <span className="absolute inset-0 grid place-items-center bg-black/70 p-1 text-center text-[9px] leading-tight text-red-200" role="alert">
                      {draft.error}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.key)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/75 text-xs leading-none text-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-end gap-1.5 rounded-[26px] border border-line/16 bg-void/50 p-1.5 transition-[border-color,box-shadow] duration-300 focus-within:border-ink/60 focus-within:shadow-[0_0_0_4px_rgb(255_255_255/0.05)]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending || (thread?.imagesLeft ?? 0) <= drafts.length}
              aria-label="Attach reference images"
              title="Attach reference images"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fog/75 transition-colors hover:bg-white/[0.06] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
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
              rows={1}
              maxLength={CHAT_LIMITS.messageChars}
              placeholder="Type your message"
              aria-label="Your message"
              onChange={(event) => {
                setText(event.target.value);
                // Grow with the text, up to a few lines.
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
              className="max-h-[150px] min-h-11 w-full resize-none bg-transparent px-2 py-[11px] text-base leading-snug text-ink outline-none placeholder:text-fog/50 md:text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || uploading || (!text.trim() && !drafts.some((draft) => draft.id))}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-void transition-[transform,opacity] hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="sr-only">Send</span>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
          <p className={cn("mt-2 px-2 text-[11px]", error ? "text-red-200" : "text-fog/55")} role={error ? "alert" : undefined}>
            {error ??
              (nearLimit
                ? `${CHAT_LIMITS.messageChars - text.length} characters left`
                : (thread?.messagesLeft ?? 0) <= 5
                  ? `${thread?.messagesLeft} messages left in this chat`
                  : withOwner
                    ? `You're chatting with ${SITE.name}.`
                    : "AI assistant: prices are guides, final price confirmed by Virguê.")}
          </p>
        </div>
      ) : null}
    </>
  );
}

const STARTERS = ["A game UI", "A website or landing page", "Replicate a style I like", "I'm not sure yet"];

function Banner({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto max-w-md rounded-2xl border border-line/12 bg-white/[0.03] px-4 py-3 text-center text-xs leading-relaxed text-fog/80">{children}</p>;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-8 md:px-10">
      <div className="m-auto flex w-full max-w-md flex-col items-center text-center">
        <AgentIcon mode="away" size={72} />
        <p className="mt-6 font-serif text-2xl leading-tight tracking-[-0.04em]">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-fog/75">{children}</p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 items-center rounded-full border border-line/25 px-6 text-[11px] tracking-[0.22em] text-ink transition-colors hover:border-line/50"
        >
          BACK TO THE SITE
        </Link>
      </div>
    </div>
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
  const current = reading && step === 0 ? READING : (THINKING[(reading ? step - 1 : step) % THINKING.length] ?? THINKING[0]);

  return (
    <div className="bubble-in flex items-end gap-2" role="status" aria-live="polite">
      <AgentIcon mode="thinking" size={28} />
      <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-line/12 bg-white/[0.03] py-2.5 pl-3 pr-4 text-xs text-fog/80">
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

const clock = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function Bubble({ message, grouped }: { message: Message; grouped: boolean }) {
  const mine = message.role === "user";
  return (
    <div className={cn("bubble-in flex items-end gap-2", mine ? "justify-end" : "justify-start", grouped && "-mt-3")}>
      {mine ? null : (
        <span className={cn(grouped && "invisible")}>{message.owner ? <OwnerIcon size={28} /> : <AgentIcon size={28} />}</span>
      )}
      <div className={cn("flex min-w-0 max-w-[82%] flex-col md:max-w-[75%]", mine ? "items-end" : "items-start")}>
        {message.owner && !grouped ? <span className="mb-1 px-1 text-[10px] tracking-[0.22em] text-fog/60">{SITE.name.toUpperCase()}</span> : null}
        <div
          className={cn(
            "whitespace-pre-wrap text-pretty break-words rounded-2xl border px-4 py-2.5 text-sm leading-relaxed",
            mine
              ? "rounded-br-md border-transparent bg-ink text-void"
              : message.owner
                ? "rounded-bl-md border-line/35 bg-white/[0.07] text-ink"
                : "rounded-bl-md border-line/10 bg-white/[0.035] text-fog/90",
          )}
        >
          {message.content}
          {message.images.length ? (
            <span className={cn("flex flex-wrap gap-2", message.content && "mt-2")}>
              {message.images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={image.id} src={image.url} alt="Reference you attached" className="size-24 rounded-xl border border-line/15 object-cover" loading="lazy" />
              ))}
            </span>
          ) : null}
        </div>
        {message.id !== "pending" && clock(message.at) ? <span className="mt-1 px-1 text-[10px] text-fog/45">{clock(message.at)}</span> : null}
      </div>
      {mine ? <span className={cn(grouped && "invisible")}><YouIcon size={28} /></span> : null}
    </div>
  );
}
