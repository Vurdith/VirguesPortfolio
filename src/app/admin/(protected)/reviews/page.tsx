import { ReviewsModerationTable } from "@/components/admin/reviews/ReviewsModerationTable";
import { readDb } from "@/lib/db";
import { adminReview } from "@/lib/db/reviews";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const db = await readDb();
  const reviews = [...db.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(adminReview);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div>
        <p className="text-xs tracking-[0.22em] text-fog/70">REVIEWS</p>
        <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
          Moderation.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-fog/75">
          Nothing is public until you approve it. A review shows its approved images and replies; a
          reviewer&apos;s follow-ups wait here for you, and your own replies go live with an OWNER badge.
        </p>
      </div>

      <div className="mt-8">
        <ReviewsModerationTable initialReviews={reviews} />
      </div>
    </div>
  );
}
