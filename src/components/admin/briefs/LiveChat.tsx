"use client";

import * as React from "react";

import { adminButton } from "@/components/admin/ui";
import type { AdminBrief } from "@/lib/chat/admin";
import { cn } from "@/lib/cn";

const POLL_MS = 2500;
const SUGGESTIONS = [
  "Hold the price firm and sell the value.",
  "Suggest the Full Game Package.",
  "Ask about controller and mobile support.",
  "Get their contact details, then wrap up.",
] as const;

type Mode = "reply" | "steer";
const money = (value: number) => `£${value.toLocaleString("en-GB")}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * A conversation as it happens. The owner can read along, take it over and reply personally (the
 * assistant pauses), hand it back, add private guidance the assistant follows, or end it.
 */
export function LiveChat({ initial }: { initial: AdminBrief }) {
  const [chat, setChat] = React.useState(initial);
  const [live, setLive] = React.useState(true);
  const [mode, setMode] = React.useState<Mode>("reply");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = React.useState(false);

  const listRef = React.useRef<HTMLDivElement>(null);
  const stickRef = React.useRef(true);
  const busyRef = React.useRef(false);
  React.useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // Poll this conversation while the tab is visible.
  React.useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.hidden || busyRef.current) return;
      try {
        const res = await fetch(`/api/admin/briefs/${initial.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const { brief } = (await res.json()) as { brief: AdminBrief };
        if (stopped || busyRef.current) return;
        setLive(true);
        setChat((current) => (current.updatedAt === brief.updatedAt && current.takeover === brief.takeover ? current : brief));
      } catch {
        if (!stopped) setLive(false);
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [initial.id]);

  // Follow new messages, unless the owner has scrolled up to read.
  React.useEffect(() => {
    const list = listRef.current;
    if (list && stickRef.current) list.scrollTop = list.scrollHeight;
  }, [chat.messages.length]);

  const open = chat.status === "open";

  const call = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/briefs/${chat.id}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { brief?: AdminBrief; error?: string } | null;
      if (!res.ok || !data?.brief) throw new Error(data?.error ?? "That did not work. Try again.");
      setChat(data.brief);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || busy || !open) return;
    const ok = mode === "reply" ? await call("reply", { content }) : await call("control", { action: "steer", note: content });
    if (ok) {
      setText("");
      if (mode === "reply") stickRef.current = true;
    }
  };

  const info = chat.brief;
  const replica = info.styleReplication;
  const unit = replica ? chat.styleOffer : chat.offer;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex h-[calc(100dvh-11rem)] min-h-[28rem] flex-col border border-line/12 bg-void/30">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/10 px-5 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-2xl leading-none tracking-[-0.04em]">{info.name || "Unnamed visitor"}</h1>
            <p className="mt-2 truncate text-xs text-fog/70">{info.contact || "No contact given yet"}</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] tracking-[0.22em]">
            <span
              className={cn(
                "inline-flex items-center border px-2 py-1",
                !open ? "border-line/12 text-fog/65" : chat.takeover ? "border-amber-200/40 text-amber-100" : "border-line/30 text-ink",
              )}
            >
              {!open ? "ENDED" : chat.takeover ? "YOU'RE IN CONTROL" : "AI ACTIVE"}
            </span>
            <span className="inline-flex items-center gap-2 text-fog/65" role="status">
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-emerald-300" : "bg-red-300")} />
              {live ? "LIVE" : "RECONNECTING"}
            </span>
          </div>
        </header>

        <div
          ref={listRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5"
        >
          {chat.messages.map((message) => {
            const fromCustomer = message.role === "user";
            return (
              <div key={message.id} className={cn("flex flex-col", fromCustomer ? "items-start" : "items-end")}>
                <span className="mb-1 text-[10px] tracking-[0.22em] text-fog/60">
                  {fromCustomer ? "CUSTOMER" : message.owner ? "YOU" : "AI"} · {time(message.at)}
                </span>
                <div
                  className={cn(
                    "max-w-[86%] whitespace-pre-wrap text-pretty border px-4 py-3 text-sm leading-relaxed",
                    fromCustomer
                      ? "border-line/25 bg-white/[0.05] text-ink"
                      : message.owner
                        ? "border-amber-200/30 bg-amber-100/[0.04] text-ink"
                        : "border-line/10 bg-void/40 text-fog/85",
                  )}
                >
                  {message.content}
                  {message.images.length ? (
                    <span className="mt-2 flex flex-wrap gap-2">
                      {message.images.map((image) => (
                        <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer" className="block size-20 overflow-hidden border border-line/15">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt="Reference" className="size-full object-cover" loading="lazy" />
                        </a>
                      ))}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {open ? (
          <div className="shrink-0 border-t border-line/10 p-4">
            <div role="tablist" aria-label="What to do with this message" className="mb-3 flex gap-2">
              {(
                [
                  ["reply", "REPLY AS ME"],
                  ["steer", "STEER THE AI"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "inline-flex h-9 items-center border px-3 text-[11px] tracking-[0.22em] transition-colors",
                    mode === value ? "border-line/35 bg-white/[0.05] text-ink" : "border-line/12 text-fog/65 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "steer" ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setText(suggestion)}
                    className="border border-line/12 px-2.5 py-1.5 text-left text-xs text-fog/70 transition-colors hover:border-line/30 hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                value={text}
                rows={2}
                maxLength={mode === "reply" ? 3600 : 600}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                aria-label={mode === "reply" ? "Reply to the customer" : "Guidance for the AI"}
                placeholder={mode === "reply" ? "Write to the customer as yourself" : "Private note the AI follows from its next reply"}
                className="max-h-40 min-h-12 w-full resize-none border border-line/14 bg-void/35 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/45 focus:border-line/50"
              />
              <button type="button" onClick={() => void submit()} disabled={busy || !text.trim()} className={cn(adminButton, "h-12 shrink-0")}>
                {mode === "reply" ? "SEND" : "ADD NOTE"}
              </button>
            </div>
            <p className={cn("mt-2 text-xs", error ? "text-red-200" : "text-fog/60")} role={error ? "alert" : undefined}>
              {error ??
                (mode === "reply"
                  ? chat.takeover
                    ? "You're in control. The AI stays silent until you hand the chat back."
                    : "Sending takes the chat over: the AI pauses and the customer hears from you."
                  : "The customer never sees notes. The AI uses them on every reply from now on, within its price limits.")}
            </p>
          </div>
        ) : (
          <p className="shrink-0 border-t border-line/10 px-5 py-4 text-xs text-fog/65">
            {chat.endReason ? `${chat.endReason}. ` : ""}This chat has ended.
          </p>
        )}
      </section>

      <aside className="space-y-6">
        {open ? (
          <div className="border border-line/12 bg-void/30 p-5">
            <h2 className="text-[11px] tracking-[0.22em] text-fog/70">CONTROL</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {chat.takeover ? (
                <button type="button" disabled={busy} onClick={() => void call("control", { action: "release" })} className={adminButton}>
                  HAND BACK TO AI
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void call("control", { action: "takeover" })} className={adminButton}>
                  TAKE OVER
                </button>
              )}
              {confirmEnd ? (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setConfirmEnd(false);
                      void call("control", { action: "end" });
                    }}
                    className={cn(adminButton, "border-line/40 text-ink")}
                  >
                    CONFIRM END
                  </button>
                  <button type="button" onClick={() => setConfirmEnd(false)} className={adminButton}>
                    ×
                  </button>
                </span>
              ) : (
                <button type="button" disabled={busy} onClick={() => setConfirmEnd(true)} className={adminButton}>
                  END CHAT
                </button>
              )}
            </div>

            <h3 className="mt-6 text-[11px] tracking-[0.22em] text-fog/70">GUIDANCE FOR THE AI</h3>
            {chat.steer.length ? (
              <ul className="mt-3 space-y-2">
                {chat.steer.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 border border-line/10 px-3 py-2 text-xs leading-relaxed text-fog/80">
                    <span className="min-w-0 break-words">{item.note}</span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Remove note"
                      onClick={() => void call("control", { action: "unsteer", noteId: item.id })}
                      className="shrink-0 text-fog/60 hover:text-ink"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-fog/60">None yet. Use STEER THE AI under the chat.</p>
            )}
          </div>
        ) : null}

        <div className="border border-line/12 bg-void/30 p-5">
          <h2 className="text-[11px] tracking-[0.22em] text-fog/70">BRIEF SO FAR</h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px] tracking-[0.18em] text-fog/70">
            <dt>TYPE</dt>
            <dd className="text-fog/85">{replica ? "Style replication" : "Original design"}</dd>
            <dt>{replica ? "TASKS" : "FRAMES"}</dt>
            <dd className="text-fog/85">{info.frames ?? "—"}</dd>
            <dt>PRICE</dt>
            <dd className="text-fog/85">
              {money(unit)} / {replica ? "task" : "frame"}
              {info.frames ? ` · ${money(info.frames * unit)}` : ""}
            </dd>
            <dt>PLATFORM</dt>
            <dd className="text-fog/85">{info.platform || "—"}</dd>
            <dt>DEADLINE</dt>
            <dd className="text-fog/85">{info.deadline || "—"}</dd>
            <dt>MESSAGES</dt>
            <dd className="text-fog/85">{chat.userTurns}</dd>
            <dt>COST</dt>
            <dd className="text-fog/85">${chat.costUsd.toFixed(4)}</dd>
          </dl>
          {info.screens.length ? (
            <p className="mt-4 text-xs leading-relaxed text-fog/75">
              <span className="tracking-[0.22em] text-fog/70">SCREENS </span>
              {info.screens.join(" · ")}
            </p>
          ) : null}
          {info.style ? (
            <p className="mt-3 text-xs leading-relaxed text-fog/75">
              <span className="tracking-[0.22em] text-fog/70">STYLE </span>
              {info.style}
            </p>
          ) : null}
          {info.summary ? (
            <p className="mt-4 whitespace-pre-wrap border-t border-line/10 pt-4 text-xs leading-relaxed text-fog/75">{info.summary}</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
