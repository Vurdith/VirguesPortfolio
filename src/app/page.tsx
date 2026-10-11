import { Hero } from "@/sections/Hero";
import { WorkGallery } from "@/sections/WorkGallery";
import { OfferingsSection } from "@/sections/OfferingsSection";
import { ProcessBlueprint } from "@/sections/ProcessBlueprint";
import { ReviewsSection } from "@/sections/ReviewsSection";
import { PaymentSection } from "@/sections/PaymentSection";
import { ContactFooter } from "@/sections/ContactFooter";

import { getPublicPortfolioData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { works, reviews } = await getPublicPortfolioData();

  return (
    <main id="main" tabIndex={-1} className="film-grain vignette outline-none">
      <Hero />
      <WorkGallery works={works} />
      <OfferingsSection />
      <ProcessBlueprint />
      <PaymentSection />
      <ReviewsSection reviews={reviews} />
      <ContactFooter />
    </main>
  );
}
