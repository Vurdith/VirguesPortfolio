"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { Review, ReviewStatus } from "@/types/portfolio";
import { Stars } from "@/components/Stars";
import { cn } from "@/lib/cn";

type BusyAction = "approve" | "reject" | "delete";
type RowBusy = { id: string; action: BusyAction } | null;

export function ReviewsModerationTable({ initialReviews }: { initialReviews: Review[] }) {
  const router = useRouter();

  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
  const [busy, setBusy] = React.useState<RowBusy>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setReviews(initialReviews), [initialReviews]);

  const patch = async (id: string, status: ReviewStatus, action: BusyAction) => {
    setBusy({ id, action });
    setError(null);

    const prev = reviews;
    setReviews((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));

    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      router.refresh();
    } catch (e) {
      setReviews(prev);
      setError(e instanceof Error ? e.message : "Failed to update.");
    } finally {
      setBusy(null);
    }
  };

  const del = async (id: string) => {
    const ok = window.confirm("Delete this review? This cannot be undone.");
    if (!ok) return;

    setBusy({ id, action: "delete" });
    setError(null);

    const prev = reviews;
    setReviews((r) => r.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      router.refresh();
    } catch (e) {
      setReviews(prev);
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setBusy(null);
    }
  };

  const sorted = React.useMemo(() => {
    const rank: Record<ReviewStatus, number> = { pending: 0, approved: 1, rejected: 2 };
    return [...reviews].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [reviews]);

  return (
    <div className="overflow-hidden border border-line/12 bg-void/25">
      <div className="hidden grid-cols-12 gap-3 border-b border-line/10 px-5 py-3 text-[11px] tracking-[0.22em] text-fog/70 md:grid">
        <div className="col-span-5">REVIEW</div>
        <div className="col-span-2">RATING</div>
        <div className="col-span-2">STATUS</div>
        <div className="col-span-1 text-center">APPROVE</div>
        <div className="col-span-1 text-center">REJECT</div>
        <div className="col-span-1 text-center">DELETE</div>
      </div>

      {sorted.length ? (
        <div className="divide-y divide-line/10">
          {sorted.map((r) => (
            <div
              key={r.id}
              className="grid gap-5 px-5 py-5 transition-colors duration-300 hover:bg-white/[0.025] md:grid-cols-12 md:items-start md:gap-3 md:py-4"
            >
              <div className="md:col-span-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="font-serif text-lg leading-none tracking-[-0.03em]">{r.name}</div>
                  <div className="text-[11px] tracking-[0.22em] text-fog/70">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <p className="mt-3 text-pretty text-sm leading-relaxed text-fog/80">“{r.text}”</p>
              </div>

              <div className="md:col-span-2">
                <Stars rating={r.rating} glyph="★" />
              </div>

              <div className="md:col-span-2">
                <StatusBadge status={r.status} />
              </div>

              <div className="flex gap-2 md:col-span-3 md:justify-end">
                <ActionButton
                  label="APPROVE"
                  disabled={busy?.id === r.id || r.status === "approved"}
                  onClick={() => void patch(r.id, "approved", "approve")}
                />
                <ActionButton
                  label="REJECT"
                  disabled={busy?.id === r.id || r.status === "rejected"}
                  onClick={() => void patch(r.id, "rejected", "reject")}
                />
                <ActionButton
                  label="DEL"
                  disabled={busy?.id === r.id}
                  danger
                  onClick={() => void del(r.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-sm text-fog/70">No reviews yet.</div>
      )}

      {error ? <div className="border-t border-line/10 px-5 py-4 text-sm text-fog/80">{error}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const label =
    status === "pending" ? "PENDING" : status === "approved" ? "APPROVED" : "REJECTED";
  return (
    <span className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[11px] tracking-[0.22em] text-fog/70">
      {label}
    </span>
  );
}


function ActionButton({
  label,
  disabled,
  danger,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-12 items-center justify-center border border-line/12 bg-void/35 px-3 text-[11px] tracking-[0.22em] text-fog/70 transition-[border-color,color,transform,opacity] duration-300",
        "hover:-translate-y-px hover:border-line/25 hover:text-ink active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        danger && "hover:border-line/35",
      )}
    >
      {label}
    </button>
  );
}


