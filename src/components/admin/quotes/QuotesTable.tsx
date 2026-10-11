"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { QuoteRequest, QuoteStatus } from "@/types/portfolio";
import { cn } from "@/lib/cn";

const STATUS_RANK: Record<QuoteStatus, number> = { new: 0, replied: 1, closed: 2 };
const NEXT_STATUS: Record<QuoteStatus, QuoteStatus> = {
  new: "replied",
  replied: "closed",
  closed: "new",
};

export function QuotesTable({ initialQuotes }: { initialQuotes: QuoteRequest[] }) {
  const router = useRouter();
  const [quotes, setQuotes] = React.useState(initialQuotes);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setQuotes(initialQuotes), [initialQuotes]);

  const sorted = React.useMemo(
    () =>
      [...quotes].sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.createdAt.localeCompare(a.createdAt),
      ),
    [quotes],
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

  const advance = (quote: QuoteRequest) => {
    const status = NEXT_STATUS[quote.status];
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
    if (!window.confirm(`Delete the request from ${quote.name}? This cannot be undone.`)) return;
    void request(quote.id, { method: "DELETE" }, (list) => list.filter((q) => q.id !== quote.id));
  };

  return (
    <div className="overflow-hidden border border-line/12 bg-void/25">
      {sorted.length ? (
        <div className="divide-y divide-line/10">
          {sorted.map((quote) => (
            <article
              key={quote.id}
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
                <button
                  type="button"
                  disabled={busyId === quote.id}
                  onClick={() => advance(quote)}
                  className="inline-flex h-9 items-center border border-line/12 bg-void/35 px-3 text-[11px] tracking-[0.22em] text-fog/70 transition-colors hover:border-line/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  MARK {NEXT_STATUS[quote.status].toUpperCase()}
                </button>
                <button
                  type="button"
                  disabled={busyId === quote.id}
                  onClick={() => remove(quote)}
                  className="inline-flex h-9 items-center border border-line/12 bg-void/35 px-3 text-[11px] tracking-[0.22em] text-fog/70 transition-colors hover:border-line/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  DEL
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-sm text-fog/70">No quote requests yet.</div>
      )}

      {error ? <div className="border-t border-line/10 px-5 py-4 text-sm text-fog/80">{error}</div> : null}
    </div>
  );
}
