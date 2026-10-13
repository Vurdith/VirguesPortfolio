"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { adminButton } from "@/components/admin/ui";
import type { AdminBrief } from "@/lib/chat/admin";
import { cn } from "@/lib/cn";
import type { QuoteStatus } from "@/types/portfolio";

const NEXT_HANDLED: Record<QuoteStatus, QuoteStatus> = { new: "replied", replied: "closed", closed: "new" };
const FILTERS = ["all", "new", "replied", "closed", "unfinished"] as const;
type Filter = (typeof FILTERS)[number];

const isFinished = (brief: AdminBrief) => brief.status === "resolved";

function matches(brief: AdminBrief, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "unfinished") return !isFinished(brief);
  return isFinished(brief) && brief.handled === filter;
}

const money = (value: number) => `£${value.toLocaleString("en-GB")}`;

/** The reply link for whatever contact the customer gave, when it can be turned into one. */
function contactLink(contact: string) {
  const email = contact.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/)?.[0];
  return email ? `mailto:${email}?subject=${encodeURIComponent("Your design brief")}` : null;
}

export function BriefsTable({ initialBriefs }: { initialBriefs: AdminBrief[] }) {
  const router = useRouter();
  const [briefs, setBriefs] = React.useState(initialBriefs);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [open, setOpen] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setBriefs(initialBriefs), [initialBriefs]);

  // Stay live: ask for anything that changed since the newest conversation we have, every few seconds
  // while this tab is visible. New messages appear in open chats without a refresh.
  const [live, setLive] = React.useState(true);
  const sinceRef = React.useRef("");
  const busyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    busyRef.current = busyId;
  }, [busyId]);
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
        if (stopped) return;
        setLive(true);
        if (!changed.length) return;
        setBriefs((current) => {
          const byId = new Map(current.map((brief) => [brief.id, brief]));
          for (const brief of changed) byId.set(brief.id, brief);
          return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        });
      } catch {
        if (!stopped) setLive(false);
      }
    };
    const timer = window.setInterval(() => void poll(), 3000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  const counts = React.useMemo(() => {
    const result = {} as Record<Filter, number>;
    for (const item of FILTERS) result[item] = briefs.filter((brief) => matches(brief, item)).length;
    return result;
  }, [briefs]);

  const visible = briefs.filter((brief) => matches(brief, filter));

  const request = async (id: string, init: RequestInit, optimistic: (list: AdminBrief[]) => AdminBrief[]) => {
    const previous = briefs;
    setBusyId(id);
    setError(null);
    setBriefs(optimistic);
    try {
      const res = await fetch(`/api/admin/briefs/${id}`, init);
      if (!res.ok) throw new Error("Update failed.");
      router.refresh();
    } catch (err) {
      setBriefs(previous);
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const setHandled = (brief: AdminBrief, handled: QuoteStatus) =>
    void request(
      brief.id,
      { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ handled }) },
      (list) => list.map((item) => (item.id === brief.id ? { ...item, handled } : item)),
    );

  const remove = (brief: AdminBrief) => {
    setConfirmId(null);
    void request(brief.id, { method: "DELETE" }, (list) => list.filter((item) => item.id !== brief.id));
  };

  return (
    <div>
      <div role="tablist" aria-label="Filter briefs" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            onClick={() => setFilter(item)}
            className={cn(
              "inline-flex h-9 items-center gap-2 border px-3 text-[11px] tracking-[0.22em] transition-colors duration-200",
              filter === item
                ? "border-line/35 bg-white/[0.05] text-ink"
                : "border-line/12 text-fog/65 hover:border-line/25 hover:text-ink",
            )}
          >
            {item.toUpperCase()}
            <span className="tabular-nums text-fog/60">{counts[item]}</span>
          </button>
        ))}
        <span
          className="ml-auto inline-flex h-9 items-center gap-2 text-[11px] tracking-[0.22em] text-fog/65"
          role="status"
          title={live ? "Updates appear automatically" : "Connection lost, retrying"}
        >
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-emerald-300" : "bg-red-300")} />
          {live ? "LIVE" : "RECONNECTING"}
        </span>
      </div>

      <div className="mt-4 overflow-hidden border border-line/12 bg-void/30">
        {visible.length ? (
          <ul className="divide-y divide-line/10">
            {visible.map((brief) => {
              const { brief: info } = brief;
              const finished = isFinished(brief);
              const unit = info.styleReplication ? brief.styleOffer : brief.offer;
              const total = info.frames ? info.frames * unit : null;
              const link = contactLink(info.contact);
              const expanded = open === brief.id;

              return (
                <li key={brief.id} className="px-5 py-5">
                  <div className="grid gap-4 md:grid-cols-12 md:gap-6">
                    <div className="md:col-span-4">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <h2 className="font-serif text-lg leading-none tracking-[-0.03em]">{info.name || "Unnamed"}</h2>
                        <time className="text-[11px] tracking-[0.22em] text-fog/70" dateTime={brief.updatedAt}>
                          {new Date(brief.updatedAt).toLocaleDateString()}
                        </time>
                      </div>
                      <p className="mt-2 break-words text-sm text-fog/80">{info.contact || "No contact given"}</p>
                      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] tracking-[0.18em] text-fog/70">
                        <dt>PLATFORM</dt>
                        <dd className="text-fog/85">{info.platform || "—"}</dd>
                        <dt>TYPE</dt>
                        <dd className="text-fog/85">{info.styleReplication ? "Style replication" : "Original design"}</dd>
                        <dt>{info.styleReplication ? "TASKS" : "FRAMES"}</dt>
                        <dd className="text-fog/85">{info.frames ?? "—"}</dd>
                        <dt>PRICE</dt>
                        <dd className="text-fog/85">
                          {money(unit)} / {info.styleReplication ? "task" : "frame"}{total ? ` · ${money(total)}` : ""}
                        </dd>
                        <dt>DEADLINE</dt>
                        <dd className="text-fog/85">{info.deadline || "—"}</dd>
                      </dl>
                    </div>

                    <div className="min-w-0 md:col-span-6">
                      <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-fog/80">
                        {info.summary || "Nothing summarised yet."}
                      </p>
                      {info.references ? (
                        <p className="mt-3 whitespace-pre-wrap text-pretty text-xs leading-relaxed text-fog/65">
                          <span className="tracking-[0.22em] text-fog/70">REFERENCES </span>
                          {info.references}
                        </p>
                      ) : null}
                      {brief.images.length ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {brief.images.map((image) => (
                            <li key={image.id}>
                              <a href={image.url} target="_blank" rel="noopener noreferrer" className="block size-16 overflow-hidden border border-line/15 hover:border-line/40">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={image.url} alt="Reference" className="size-full object-cover" loading="lazy" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-start gap-2 md:col-span-2 md:flex-col md:items-end">
                      <span
                        className={cn(
                          "inline-flex items-center border bg-void/35 px-2 py-1 text-[11px] tracking-[0.22em]",
                          finished && brief.handled === "new" ? "border-line/35 text-ink" : "border-line/12 text-fog/70",
                        )}
                      >
                        {finished ? brief.handled.toUpperCase() : brief.status === "open" ? "IN PROGRESS" : "UNFINISHED"}
                      </span>
                      {link ? (
                        <a href={link} onClick={() => brief.handled === "new" && setHandled(brief, "replied")} className={adminButton}>
                          REPLY
                        </a>
                      ) : null}
                      <Link href={`/admin/briefs/${brief.id}`} className={adminButton}>
                        {brief.status === "open" ? "OPEN LIVE" : "OPEN"}
                      </Link>
                      <button type="button" onClick={() => setOpen(expanded ? null : brief.id)} className={adminButton}>
                        {expanded ? "HIDE CHAT" : "SHOW CHAT"}
                      </button>
                      {finished ? (
                        <button type="button" disabled={busyId === brief.id} onClick={() => setHandled(brief, NEXT_HANDLED[brief.handled])} className={adminButton}>
                          MARK {NEXT_HANDLED[brief.handled].toUpperCase()}
                        </button>
                      ) : null}
                      {confirmId === brief.id ? (
                        <span className="flex items-center gap-2">
                          <button type="button" onClick={() => remove(brief)} className={cn(adminButton, "border-line/40 text-ink")}>
                            CONFIRM
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className={adminButton}>
                            ×
                          </button>
                        </span>
                      ) : (
                        <button type="button" disabled={busyId === brief.id} onClick={() => setConfirmId(brief.id)} className={adminButton}>
                          DELETE
                        </button>
                      )}
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-5 space-y-3 border-t border-line/10 pt-5">
                      {brief.endReason ? <p className="text-[11px] tracking-[0.22em] text-fog/70">{brief.endReason.toUpperCase()}</p> : null}
                      {info.screens.length ? (
                        <p className="text-xs text-fog/70">
                          <span className="tracking-[0.22em]">SCREENS </span>
                          {info.screens.join(" · ")}
                        </p>
                      ) : null}
                      {info.style ? (
                        <p className="text-xs text-fog/70">
                          <span className="tracking-[0.22em]">STYLE </span>
                          {info.style}
                        </p>
                      ) : null}
                      {info.extras ? (
                        <p className="text-xs text-fog/70">
                          <span className="tracking-[0.22em]">EXTRAS </span>
                          {info.extras}
                        </p>
                      ) : null}
                      <ol className="space-y-2 pt-2">
                        {brief.messages.map((message) => (
                          <li
                            key={message.id}
                            className={cn(
                              "max-w-[46rem] whitespace-pre-wrap border px-4 py-3 text-sm leading-relaxed",
                              message.role === "user" ? "ml-auto border-line/25 text-ink" : "border-line/10 text-fog/80",
                            )}
                          >
                            {message.content}
                            {message.images.length ? (
                              <span className="mt-2 flex flex-wrap gap-2">
                                {message.images.map((image) => (
                                  <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer" className="block size-14 overflow-hidden border border-line/15">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={image.url} alt="Reference" className="size-full object-cover" loading="lazy" />
                                  </a>
                                ))}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                      <p className="text-[11px] tracking-[0.22em] text-fog/60">
                        {brief.userTurns} CUSTOMER MESSAGES · ${brief.costUsd.toFixed(4)} MODEL COST
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-10 text-sm text-fog/70">
            {filter === "all" ? "No conversations yet." : `No ${filter} briefs.`}
          </div>
        )}

        {error ? (
          <div role="alert" className="border-t border-line/10 px-5 py-4 text-sm text-fog/80">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
