import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const db = await readDb();
  const worksCount = db.works.length;
  const reviewsPending = db.reviews.filter((r) => r.status === "pending").length;
  const reviewsApproved = db.reviews.filter((r) => r.status === "approved").length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <div className="flex items-end justify-between gap-8">
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line/12 bg-void/25 p-6 backdrop-blur-sm">
      <div className="text-[10px] tracking-[0.22em] text-fog/70">{label}</div>
      <div className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em]">{value}</div>
      <div className="mt-3 h-px w-full bg-line/10" />
      <div className="mt-3 text-[10px] tracking-[0.22em] text-fog/55">LOCAL DB</div>
    </div>
  );
}



