"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";

import { AgentIcon, YouIcon } from "@/components/chat/Avatars";
import type { AdminBrief } from "@/lib/chat/admin";
import { cn } from "@/lib/cn";
import type { QuoteStatus } from "@/types/portfolio";
import { BriefDetails } from "./BriefDetails";
import { ConversationView } from "./ConversationView";
import { FILTERS, ago, matches, money, preview, stateOf, total, type Filter } from "./shared";

const POLL_MS = 2500;
const EASE = [0.22, 1, 0.36, 1] as const;

const panel = "overflow-hidden border-line/10 bg-void/60 backdrop-blur-xl lg:rounded-2xl lg:border";

const byNewest = (a: AdminBrief, b: AdminBrief) => b.updatedAt.localeCompare(a.updatedAt);

/**
 * The whole briefs area in one screen: conversations on the left, the open one in the middle, its
 * brief and controls on the right. Everything updates by itself while the tab is visible.
 */
export function BriefsInbox({ initialBriefs, initialId }: { initialBriefs: AdminBrief[]; initialId: string | null }) {
  const reduce = useReducedMotion();
  const [briefs, setBriefs] = React.useState(initialBriefs);
  const [selectedId, setSelectedId] = React.useState<string | null>(initialId);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [drawer, setDrawer] = React.useState(false);
  const [offline, setOffline] = React.useState(false);

  // Conversations the owner has looked at since this page opened. Anything newer is unread.
  const [seen, setSeen] = React.useState<Record<string, string>>({});
  const openedAt = React.useRef(new Date().toISOString());

  const selected = briefs.find((brief) => brief.id === selectedId) ?? null;

  React.useEffect(() => {
    if (selected) setSeen((current) => (current[selected.id] === selected.updatedAt ? current : { ...current, [selected.id]: selected.updatedAt }));
  }, [selected]);

  // Keep the address in step with the selection, and follow the back button.
  const select = React.useCallback((id: string | null) => {
    setSelectedId(id);
    setError(null);
    setDrawer(false);
    window.history.pushState(null, "", id ? `/admin/briefs/${id}` : "/admin/briefs");
  }, []);
  React.useEffect(() => {
    const onPop = () => {
      const match = window.location.pathname.match(/^\/admin\/briefs\/([^/]+)/);
      setSelectedId(match ? match[1] : null);
      setDrawer(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Live: ask for whatever changed since the newest conversation we have.
  const sinceRef = React.useRef("");
  const busyRef = React.useRef(false);
  React.useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  React.useEffect(() => {
    sinceRef.current = briefs.reduce((latest, brief) => (brief.updatedAt > latest ? brief.updatedAt : latest), "");
  }, [briefs]);
  React.useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.hidden || busyRef.current) return;
      try {
        const res = await fetch(`/api/admin/briefs?since=${encodeURIComponent(sinceRef.current)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const { briefs: changed } = (await res.json()) as { briefs: AdminBrief[] };
        if (stopped || busyRef.current) return;
        setOffline(false);
        if (!changed.length) return;
        setBriefs((current) => {
          const byId = new Map(current.map((brief) => [brief.id, brief]));
          for (const brief of changed) byId.set(brief.id, brief);
          return [...byId.values()].sort(byNewest);
        });
      } catch {
        if (!stopped) setOffline(true);
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  // Relative times ("5m") tick over.
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const replace = (brief: AdminBrief) =>
    setBriefs((current) => current.map((item) => (item.id === brief.id ? brief : item)).sort(byNewest));

  const call = async (id: string, path: "reply" | "control" | "summary", body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/briefs/${id}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { brief?: AdminBrief; error?: string } | null;
      if (!res.ok || !data?.brief) throw new Error(data?.error ?? "That did not work. Try again.");
      replace(data.brief);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const setHandled = async (brief: AdminBrief, handled: QuoteStatus) => {
    const previous = brief.handled;
    replace({ ...brief, handled });
    try {
      const res = await fetch(`/api/admin/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      replace({ ...brief, handled: previous });
      setError("Could not update the status.");
    }
  };

  const remove = async (brief: AdminBrief) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/briefs/${brief.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBriefs((current) => current.filter((item) => item.id !== brief.id));
      select(null);
    } catch {
      setError("Could not delete that conversation.");
    } finally {
      setBusy(false);
    }
  };

  const counts = React.useMemo(() => {
    const result = {} as Record<Filter, number>;
    for (const item of FILTERS) result[item.key] = briefs.filter((brief) => matches(brief, item.key)).length;
    return result;
  }, [briefs]);

  const needle = query.trim().toLowerCase();
  const visible = briefs.filter(
    (brief) =>
      matches(brief, filter) &&
      (!needle ||
        `${brief.brief.name} ${brief.brief.contact} ${brief.brief.project} ${brief.messages.map((message) => message.content).join(" ")}`.toLowerCase().includes(needle)),
  );

  const unread = (brief: AdminBrief) => brief.id !== selectedId && brief.updatedAt > (seen[brief.id] ?? openedAt.current);

  return (
    <div className="flex h-[calc(100dvh-4.75rem)] lg:h-dvh lg:gap-3 lg:p-3">
      {/* Conversations */}
      <section className={cn("flex w-full min-w-0 flex-col lg:w-[22rem] lg:shrink-0", panel, selected && "hidden lg:flex")}>
        <div className="shrink-0 space-y-3 px-4 pb-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-serif text-3xl leading-none tracking-[-0.05em]">Briefs</h1>
            {/* A file download, not a page. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/admin/briefs/export"
              download
              title="Download every chat as JSON"
              aria-label="Download every chat as JSON"
              className="ml-auto grid size-9 place-items-center rounded-full border border-line/15 text-fog/70 transition-colors hover:border-line/35 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
              </svg>
            </a>
            <AnimatePresence>
              {offline ? (
                <motion.span
                  key="offline"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  role="status"
                  className="inline-flex items-center gap-2 rounded-full border border-red-300/25 px-3 py-1 text-xs text-red-200"
                >
                  <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-red-300" />
                  Reconnecting
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          <label className="relative block">
            <span className="sr-only">Search conversations</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fog/50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-full border border-line/10 bg-white/[0.03] pl-10 pr-4 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-fog/45 focus:border-line/40 focus:shadow-[0_0_0_4px_rgb(255_255_255/0.05)]"
            />
          </label>

          <LayoutGroup id="briefs-filter">
            <div role="tablist" aria-label="Filter conversations" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {FILTERS.map((item) => {
                const active = filter === item.key;
                if (item.key !== "all" && !counts[item.key] && !active) return null;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(item.key)}
                    className={cn("relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors", active ? "text-ink" : "text-fog/65 hover:text-ink")}
                  >
                    {active ? (
                      <motion.span layoutId="filter-pill" aria-hidden="true" className="absolute inset-0 rounded-full border border-line/15 bg-white/[0.08]" transition={{ type: "spring", stiffness: 520, damping: 38 }} />
                    ) : null}
                    <span className="relative">{item.label}</span>
                    <span className="relative tabular-nums text-fog/50">{counts[item.key]}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((brief) => (
              <Row key={brief.id} brief={brief} active={brief.id === selectedId} unread={unread(brief)} onSelect={() => select(brief.id)} />
            ))}
          </AnimatePresence>
          {!visible.length ? (
            <li className="px-4 py-12 text-center text-sm text-fog/55">{briefs.length ? "Nothing matches." : "No conversations yet."}</li>
          ) : null}
        </ul>
      </section>

      {/* Conversation */}
      <section className={cn("min-w-0 flex-1 flex-col", panel, selected ? "flex" : "hidden lg:flex")}>
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div
              key={selected.id}
              initial={reduce ? false : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <ConversationView
                brief={selected}
                busy={busy}
                error={error}
                onBack={() => select(null)}
                onInfo={() => setDrawer(true)}
                onTakeover={(on) => void call(selected.id, "control", { action: on ? "takeover" : "release" })}
                onSend={(mode, text) =>
                  mode === "reply" ? call(selected.id, "reply", { content: text }) : call(selected.id, "control", { action: "steer", note: text })
                }
              />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-auto flex flex-col items-center px-6 text-center">
              <AgentIcon size={96} />
              <p className="mt-6 font-serif text-3xl leading-none tracking-[-0.05em]">Pick a conversation</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-fog/60">Read along live, take over when it matters, or guide the AI without the customer seeing.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Brief and controls */}
      {selected ? (
        <aside className={cn("hidden w-[21rem] shrink-0 flex-col xl:flex", panel)}>
          <Details brief={selected} busy={busy} setHandled={setHandled} call={call} remove={remove} />
        </aside>
      ) : null}

      <AnimatePresence>
        {drawer && selected ? (
          <div className="fixed inset-0 z-[70] xl:hidden">
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute inset-y-0 right-0 flex w-[min(24rem,100%)] flex-col border-l border-line/10 bg-[#0c0c0d]"
            >
              <div className="flex shrink-0 justify-end p-3 pb-0">
                <button type="button" onClick={() => setDrawer(false)} aria-label="Close" className="grid size-10 place-items-center rounded-full border border-line/15 text-fog/80 hover:text-ink">
                  ×
                </button>
              </div>
              <Details brief={selected} busy={busy} setHandled={setHandled} call={call} remove={remove} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Details({
  brief,
  busy,
  setHandled,
  call,
  remove,
}: {
  brief: AdminBrief;
  busy: boolean;
  setHandled: (brief: AdminBrief, handled: QuoteStatus) => Promise<void>;
  call: (id: string, path: "reply" | "control" | "summary", body: unknown) => Promise<boolean>;
  remove: (brief: AdminBrief) => Promise<void>;
}) {
  return (
    <BriefDetails
      brief={brief}
      busy={busy}
      onHandled={(handled) => void setHandled(brief, handled)}
      onEnd={() => void call(brief.id, "control", { action: "end" })}
      onUnsteer={(noteId) => void call(brief.id, "control", { action: "unsteer", noteId })}
      onDelete={() => void remove(brief)}
      onSummary={() => call(brief.id, "summary", {})}
    />
  );
}

function Row({ brief, active, unread, onSelect }: { brief: AdminBrief; active: boolean; unread: boolean; onSelect: () => void }) {
  const state = stateOf(brief);
  const sum = total(brief);
  const waiting = brief.takeover && brief.status === "open" && brief.messages.at(-1)?.role === "user";
  // Only what needs you gets a badge: a finished brief you have not dealt with, or a customer waiting on you.
  const chip = waiting ? "Waiting for you" : state.tone === "new" ? "New" : null;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "group relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
          active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
        )}
      >
        {active ? <motion.span layoutId="row-bar" aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-ink" /> : null}
        <span className="relative mt-0.5">
          <YouIcon size={38} />
          {brief.status === "open" ? (
            <span aria-hidden="true" className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0c0c0d]", brief.working ? "animate-pulse bg-amber-300" : brief.takeover ? "bg-ink" : "bg-emerald-400")} />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("truncate font-serif text-base leading-tight tracking-[-0.02em]", unread && "text-ink")}>{brief.brief.name || "Unnamed visitor"}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-fog/50">{ago(brief.updatedAt)}</span>
          </span>
          <span className={cn("mt-0.5 block truncate text-[13px]", unread ? "text-fog/90" : "text-fog/55")}>
            {brief.working && !brief.takeover ? "Writing a reply…" : preview(brief)}
          </span>
          {chip || sum ? (
            <span className="mt-2 flex items-center gap-2 text-[11px]">
              {chip ? (
                <span className={cn("rounded-full px-2 py-0.5", chip === "New" ? "bg-ink text-void" : "border border-line/40 text-ink")}>{chip}</span>
              ) : null}
              {sum ? <span className="tabular-nums text-fog/55">{money(sum)}</span> : null}
            </span>
          ) : null}
        </span>
      </button>
    </motion.li>
  );
}
