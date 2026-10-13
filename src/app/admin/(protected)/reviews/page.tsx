import { PageHeader } from "@/components/admin/ui";
import { ReviewsModerationTable } from "@/components/admin/reviews/ReviewsModerationTable";
import { readDb } from "@/lib/db";
import { adminReview } from "@/lib/db/reviews";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const db = await readDb();
  const reviews = [...db.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(adminReview);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader title="Reviews" description="Nothing is public until you approve it. Your own replies go live with an OWNER badge." />

      <div className="mt-8">
        <ReviewsModerationTable initialReviews={reviews} />
      </div>
    </div>
  );
}
