"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ThinkingOrb } from "thinking-orbs";

import { AgentIcon, OwnerIcon, TypingDots, YouIcon } from "@/components/chat/Avatars";
import type { AdminBrief } from "@/lib/chat/admin";
import { cn } from "@/lib/cn";
import { clock, stateOf } from "./shared";

type Mode = "reply" | "steer";
type Message = AdminBrief["messages"][number];

const SUGGESTIONS = [
  "Hold the price and sell the value.",
  "Suggest the Full Game Package.",
  "Ask about controller and mobile support.",
  "Get their contact details, then wrap up.",
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One conversation, drawn like the customer's chat: the customer on the left, the assistant and you
 * on the right. Writing a reply takes the chat over; "Guide the AI" adds a private note instead.
 */
export function ConversationView({
  brief,
  busy,
  error,
  onSend,
  onTakeover,
  onBack,
  onInfo,
}: {
  brief: AdminBrief;
  busy: boolean;
  error: string | null;
  onSend: (mode: Mode, text: string) => Promise<boolean>;
  onTakeover: (on: boolean) => void;
  onBack: () => void;
  onInfo: () => void;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = React.useState<Mode>("reply");
  const [text, setText] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const stickRef = React.useRef(true);

  const open = brief.status === "open";
  const state = stateOf(brief);

  // Follow new messages, unless the owner scrolled up to read.
  const last = brief.messages.at(-1)?.id;
  React.useEffect(() => {
    const list = listRef.current;
    if (list && stickRef.current) list.scrollTo({ top: list.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [last, brief.working, reduce]);
  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, []);
  React.useEffect(() => {
    if (!text && inputRef.current) inputRef.current.style.height = "auto";
  }, [text]);

  const submit = async () => {
    const content = text.trim();
    if (!content || busy || !open) return;
    if (await onSend(mode, content)) {
      setText("");
      if (mode === "reply") stickRef.current = true;
    }
  };

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-line/10 px-3 py-3 md:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line/15 text-fog/80 transition-colors hover:border-line/35 hover:text-ink lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>

        <YouIcon size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-xl leading-none tracking-[-0.04em]">{brief.brief.name || "Unnamed visitor"}</h1>
          <p className="mt-1.5 truncate text-xs text-fog/60">{brief.brief.contact || "No contact given yet"}</p>
        </div>

        {open ? (
          <LayoutGroup id={`who-${brief.id}`}>
            <div role="group" aria-label="Who is replying" className="relative flex shrink-0 rounded-full border border-line/15 bg-void/50 p-1">
              {(
                [
                  [false, "AI"],
                  [true, "You"],
                ] as const
              ).map(([on, label]) => {
                const active = brief.takeover === on;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={busy}
                    aria-pressed={active}
                    onClick={() => !active && onTakeover(on)}
                    className={cn("relative h-8 rounded-full px-4 text-xs transition-colors disabled:opacity-60", active ? "text-void" : "text-fog/75 hover:text-ink")}
                  >
                    {active ? (
                      <motion.span
                        layoutId="who-pill"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full bg-ink"
                        transition={{ type: "spring", stiffness: 520, damping: 36 }}
                      />
                    ) : null}
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        ) : (
          <span className="shrink-0 rounded-full border border-line/15 px-3 py-1.5 text-xs text-fog/70">{state.label === "Unfinished" ? "Unfinished" : "Ended"}</span>
        )}

        <button
          type="button"
          onClick={onInfo}
          aria-label="Brief and controls"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line/15 text-fog/80 transition-colors hover:border-line/35 hover:text-ink xl:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        </button>
      </header>

      <AnimatePresence initial={false}>
        {brief.lastError ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-red-300/20 bg-red-300/[0.05] px-5 text-xs leading-relaxed text-red-200"
          >
            <span className="block py-3">
              The assistant could not reply ({clock(brief.lastError.at)}): {brief.lastError.message}
            </span>
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div
        ref={listRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-6 md:px-6"
      >
        {brief.messages.map((message, index) => (
          <Bubble key={message.id} message={message} grouped={index > 0 && sameSender(brief.messages[index - 1], message)} />
        ))}

        <AnimatePresence>{brief.working && !brief.takeover ? <Working key="working" /> : null}</AnimatePresence>

        {!open ? (
          <p className="mx-auto max-w-md rounded-2xl border border-line/10 bg-white/[0.03] px-4 py-3 text-center text-xs leading-relaxed text-fog/70">
            {brief.endReason ? `${brief.endReason}. ` : ""}This chat has ended.
          </p>
        ) : null}
      </div>

      {open ? (
        <div className="shrink-0 border-t border-line/10 px-3 pb-3 pt-3 md:px-5 md:pb-4">
          <div className="mb-3 flex items-center gap-2">
            <LayoutGroup id={`mode-${brief.id}`}>
              <div role="tablist" aria-label="What to do with your message" className="relative flex rounded-full border border-line/10 bg-void/40 p-1">
                {(
                  [
                    ["reply", "Reply as you"],
                    ["steer", "Guide the AI"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => setMode(value)}
                    className={cn("relative h-8 rounded-full px-4 text-xs transition-colors", mode === value ? "text-ink" : "text-fog/65 hover:text-ink")}
                  >
                    {mode === value ? (
                      <motion.span
                        layoutId="mode-pill"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full bg-white/[0.1]"
                        transition={{ type: "spring", stiffness: 520, damping: 36 }}
                      />
                    ) : null}
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            {mode === "reply" && !brief.takeover ? <span className="text-xs text-fog/55">Sending pauses the AI.</span> : null}
            {mode === "steer" ? <span className="text-xs text-fog/55">Only the AI sees this.</span> : null}
          </div>

          <AnimatePresence initial={false}>
            {mode === "steer" ? (
              <motion.div
                key="suggestions"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="-mx-3 overflow-hidden px-3 md:mx-0 md:px-0"
              >
                <div className="flex gap-2 overflow-x-auto pb-3 md:flex-wrap md:overflow-visible">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setText(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="shrink-0 rounded-full border border-line/15 bg-white/[0.03] px-3.5 py-2 text-xs text-fog/80 transition-colors hover:border-line/35 hover:text-ink"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex items-end gap-1.5 rounded-[26px] border border-line/15 bg-void/50 p-1.5 transition-[border-color,box-shadow] duration-300 focus-within:border-ink/60 focus-within:shadow-[0_0_0_4px_rgb(255_255_255/0.05)]">
            <textarea
              ref={inputRef}
              value={text}
              rows={1}
              maxLength={mode === "reply" ? 3600 : 600}
              onChange={(event) => {
                setText(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submit();
                }
              }}
              aria-label={mode === "reply" ? "Reply to the customer" : "Guidance for the AI"}
              placeholder={mode === "reply" ? "Write to the customer as yourself" : "A private note the AI follows from its next reply"}
              className="max-h-[150px] min-h-11 w-full resize-none bg-transparent px-3.5 py-[11px] text-base leading-snug text-ink outline-none placeholder:text-fog/50 md:text-sm"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !text.trim()}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-void transition-[transform,opacity] hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="sr-only">{mode === "reply" ? "Send" : "Add note"}</span>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
          {error ? (
            <p className="mt-2 px-2 text-xs text-red-200" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const sameSender = (a: Message, b: Message) => a.role === b.role && a.owner === b.owner;

/** The assistant is writing: the same orb and avatar the customer sees. */
function Working() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -4 }}
      className="flex items-end justify-end gap-2"
      role="status"
    >
      <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-br-md border border-line/10 bg-white/[0.03] py-2.5 pl-3 pr-4 text-xs text-fog/80">
        <ThinkingOrb state="composing" size={20} theme="dark" aria-label="The assistant is writing" />
        Writing a reply
        <TypingDots />
      </div>
      <AgentIcon mode="thinking" size={28} />
    </motion.div>
  );
}

/** The customer sits on the left, the assistant and the owner on the right. */
function Bubble({ message, grouped }: { message: Message; grouped: boolean }) {
  const customer = message.role === "user";
  return (
    <div className={cn("bubble-in flex items-end gap-2", customer ? "justify-start" : "justify-end", grouped && "-mt-3")}>
      {customer ? (
        <span className={cn(grouped && "invisible")}>
          <YouIcon size={28} />
        </span>
      ) : null}
      <div className={cn("flex min-w-0 max-w-[82%] flex-col md:max-w-[70%]", customer ? "items-start" : "items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap text-pretty break-words rounded-2xl border px-4 py-2.5 text-sm leading-relaxed",
            customer
              ? "rounded-bl-md border-line/10 bg-white/[0.045] text-ink"
              : message.owner
                ? "rounded-br-md border-transparent bg-ink text-void"
                : "rounded-br-md border-line/10 bg-white/[0.02] text-fog/85",
          )}
        >
          {message.content}
          {message.images.length ? (
            <span className={cn("flex flex-wrap gap-2", message.content && "mt-2")}>
              {message.images.map((image) => (
                <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer" className="block size-24 overflow-hidden rounded-xl border border-line/15 transition-transform hover:scale-[1.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="Reference" className="size-full object-cover" loading="lazy" />
                </a>
              ))}
            </span>
          ) : null}
        </div>
        {!grouped ? <span className="mt-1 px-1 text-[10px] text-fog/45">{clock(message.at)}</span> : null}
      </div>
      {!customer ? <span className={cn(grouped && "invisible")}>{message.owner ? <OwnerIcon size={28} /> : <AgentIcon size={28} />}</span> : null}
    </div>
  );
}
