"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { QuoteRequest, QuoteStatus } from "@/types/portfolio";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

const STATUS_RANK: Record<QuoteStatus, number> = { new: 0, replied: 1, closed: 2 };
const NEXT_STATUS: Record<QuoteStatus, QuoteStatus> = {
  new: "replied",
  replied: "closed",
  closed: "new",
};
const FILTERS = ["all", "new", "replied", "closed"] as const;
type Filter = (typeof FILTERS)[number];

export function QuotesTable({ initialQuotes }: { initialQuotes: QuoteRequest[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [quotes, setQuotes] = React.useState(initialQuotes);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setQuotes(initialQuotes), [initialQuotes]);

  const counts = React.useMemo(() => {
    const result: Record<Filter, number> = { all: quotes.length, new: 0, replied: 0, closed: 0 };
    for (const quote of quotes) result[quote.status] += 1;
    return result;
  }, [quotes]);

  const visible = React.useMemo(
    () =>
      quotes
        .filter((quote) => filter === "all" || quote.status === filter)
        .sort(
          (a, b) =>
            STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.createdAt.localeCompare(a.createdAt),
        ),
    [quotes, filter],
  );

  const request = async (id: string, init: RequestInit, optimistic: (list: QuoteRequest[]) => QuoteRequest[]) => {
    const previous = quotes;
    setBusyId(id);
    setError(null);
    setQuotes(optimistic);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, init);
      if (!res.ok) throw new Error("Update failed.");
      router.refresh();
    } catch (err) {
      setQuotes(previous);
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (quote: QuoteRequest, status: QuoteStatus) => {
    void request(
      quote.id,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      },
      (list) => list.map((q) => (q.id === quote.id ? { ...q, status } : q)),
    );
  };

  const remove = (quote: QuoteRequest) => {
    setConfirmId(null);
    void request(quote.id, { method: "DELETE" }, (list) => list.filter((q) => q.id !== quote.id));
  };

  return (
    <div>
      <div role="tablist" aria-label="Filter quotes" className="flex flex-wrap gap-2">
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
      </div>

      <div className="mt-4 overflow-hidden border border-line/12 bg-void/30">
        {visible.length ? (
          <ul className="divide-y divide-line/10">
            <AnimatePresence initial={false}>
              {visible.map((quote, index) => (
                <motion.li
                  key={quote.id}
                  layout={reduce ? false : "position"}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 6) * 0.04 }}
                  className="grid gap-4 px-5 py-5 transition-colors duration-300 hover:bg-white/[0.025] md:grid-cols-12 md:gap-6"
                >
                  <div className="md:col-span-4">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h2 className="font-serif text-lg leading-none tracking-[-0.03em]">{quote.name}</h2>
                      <time className="text-[11px] tracking-[0.22em] text-fog/70" dateTime={quote.createdAt}>
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-fog/80">
                      {quote.email ? (
                        <a
                          href={`mailto:${quote.email}?subject=${encodeURIComponent("Your quote request")}`}
                          className="block underline-offset-4 hover:text-ink hover:underline"
                        >
                          {quote.email}
                        </a>
                      ) : null}
                      {quote.discord ? (
                        <p>
                          <span className="text-[11px] tracking-[0.22em] text-fog/70">DISCORD </span>
                          {quote.discord}
                        </p>
                      ) : null}
                      {quote.x ? (
                        <a
                          href={`https://x.com/${encodeURIComponent(quote.x)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block underline-offset-4 hover:text-ink hover:underline"
                        >
                          <span className="text-[11px] tracking-[0.22em] text-fog/70">X </span>@{quote.x}
                        </a>
                      ) : null}
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] tracking-[0.18em] text-fog/70">
                      <dt>SERVICE</dt>
                      <dd className="text-fog/85">{quote.service}</dd>
                      <dt>BUDGET</dt>
                      <dd className="text-fog/85">{quote.budget}</dd>
                      <dt>DEADLINE</dt>
                      <dd className="text-fog/85">{quote.deadline || "—"}</dd>
                    </dl>
                  </div>

                  <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-fog/80 md:col-span-6">
                    {quote.details}
                  </p>

                  <div className="flex flex-wrap items-start gap-2 md:col-span-2 md:flex-col md:items-end">
                    <span
                      className={cn(
                        "inline-flex items-center border bg-void/35 px-2 py-1 text-[11px] tracking-[0.22em]",
                        quote.status === "new" ? "border-line/35 text-ink" : "border-line/12 text-fog/70",
                      )}
                    >
                      {quote.status.toUpperCase()}
                    </span>
                    {quote.email ? (
                      <a
                        href={`mailto:${quote.email}?subject=${encodeURIComponent("Your quote request")}`}
                        onClick={() => quote.status === "new" && setStatus(quote, "replied")}
                        className={adminButton}
                      >
                        REPLY
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === quote.id}
                      onClick={() => setStatus(quote, NEXT_STATUS[quote.status])}
                      className={adminButton}
                    >
                      MARK {NEXT_STATUS[quote.status].toUpperCase()}
                    </button>
                    {confirmId === quote.id ? (
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => remove(quote)} className={cn(adminButton, "border-line/40 text-ink")}>
                          CONFIRM
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className={adminButton}>
                          ×
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === quote.id}
                        onClick={() => setConfirmId(quote.id)}
                        className={adminButton}
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div className="px-5 py-10 text-sm text-fog/70">
            {filter === "all" ? "No quote requests yet." : `No ${filter} requests.`}
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
