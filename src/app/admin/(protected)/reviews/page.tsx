import { ReviewsModerationTable } from "@/components/admin/reviews/ReviewsModerationTable";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const db = await readDb();
  const reviews = db.reviews;

  const pending = reviews.filter((r) => r.status === "pending").length;
  const approved = reviews.filter((r) => r.status === "approved").length;
  const rejected = reviews.filter((r) => r.status === "rejected").length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.22em] text-fog/70">REVIEWS</p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
            Moderation.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge label="PENDING" value={pending} />
          <Badge label="APPROVED" value={approved} />
          <Badge label="REJECTED" value={rejected} />
        </div>
      </div>

      <div className="mt-10">
        <ReviewsModerationTable initialReviews={reviews} />
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-3 border border-line/12 bg-void/25 px-3 py-2 text-[10px] tracking-[0.22em] text-fog/70">
      <span>{label}</span>
      <span className="h-px w-6 bg-line/10" />
      <span className="text-ink/85">{value}</span>
    </div>
  );
}



