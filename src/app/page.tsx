import { Hero } from "@/sections/Hero";
import { WorkGallery } from "@/sections/WorkGallery";
import { OfferingsSection } from "@/sections/OfferingsSection";
import { ProcessBlueprint } from "@/sections/ProcessBlueprint";
import { ReviewsSection } from "@/sections/ReviewsSection";
import { PaymentSection } from "@/sections/PaymentSection";
import { ContactFooter } from "@/sections/ContactFooter";

import { mockWorks } from "@/content/mockWorks";
import { mockReviews } from "@/content/mockReviews";
import { getApprovedReviews, getPublicWorks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [works, reviews] = await Promise.all([getPublicWorks(), getApprovedReviews()]);
  const worksForUi = works.length ? works : mockWorks;
  const reviewsForUi = reviews.length ? reviews : mockReviews;

  return (
    <main className="film-grain vignette">
      <Hero />
      <WorkGallery works={worksForUi} />
      <OfferingsSection />
      <ProcessBlueprint />
      <ReviewsSection reviews={reviewsForUi} />
      <PaymentSection />
      <ContactFooter />
    </main>
  );
}
