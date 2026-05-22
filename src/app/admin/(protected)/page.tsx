import { readDb } from "@/lib/db";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const db = await readDb();
  const worksCount = db.works.length;
  const reviewsPending = db.reviews.filter((r) => r.status === "pending").length;
  const reviewsApproved = db.reviews.filter((r) => r.status === "approved").length;
  const latestWork = [...db.works].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.22em] text-fog/70">DASHBOARD</p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
            Control room.
          </h1>
        </div>
        <div className="hidden text-xs tracking-[0.22em] text-fog/60 md:block">/admin</div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Stat label="WORKS" value={worksCount} />
        <Stat label="REVIEWS (PENDING)" value={reviewsPending} />
        <Stat label="REVIEWS (APPROVED)" value={reviewsApproved} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Panel title="Queue">
          <div className="grid gap-3 text-sm leading-relaxed text-fog/78">
            <p>Pending reviews sit first in moderation. Published work stays public immediately.</p>
            <div className="h-px bg-line/10" />
            <p className="text-xs tracking-[0.18em] text-fog/60">
              {reviewsPending ? `${reviewsPending} REVIEW${reviewsPending === 1 ? "" : "S"} WAITING` : "NO PENDING REVIEWS"}
            </p>
          </div>
        </Panel>
        <Panel title="Latest">
          {latestWork ? (
            <div>
              <div className="font-serif text-2xl leading-none tracking-[-0.04em]">
                {latestWork.title}
              </div>
              <p className="mt-3 text-xs tracking-[0.18em] text-fog/60">
                UPDATED {new Date(latestWork.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-fog/70">No work entries yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="relative overflow-hidden border border-line/12 bg-void/35 p-6 backdrop-blur-sm transition-[border-color,background-color,transform] duration-300 hover:-translate-y-1 hover:border-line/25 hover:bg-void/50">
      <CornerLines />
      <div className="text-[10px] tracking-[0.22em] text-fog/70">{label}</div>
      <div className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em]">{value}</div>
      <div className="mt-3 h-px w-full bg-line/10" />
      <div className="mt-3 text-[10px] tracking-[0.22em] text-fog/55">LOCAL DB</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative min-h-44 overflow-hidden border border-line/12 bg-void/25 p-6 backdrop-blur-sm">
      <CornerLines />
      <p className="text-[10px] tracking-[0.28em] text-fog/55">{title.toUpperCase()}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CornerLines() {
  return (
    <span className="pointer-events-none absolute inset-0 opacity-60">
      <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/25" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/25" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/25" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/25" />
    </span>
  );
}


