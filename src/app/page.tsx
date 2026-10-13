import { Hero } from "@/sections/Hero";
import { WorkGallery } from "@/sections/WorkGallery";
import { ContributionsSection } from "@/sections/ContributionsSection";
import { OfferingsSection } from "@/sections/OfferingsSection";
import { ProcessBlueprint } from "@/sections/ProcessBlueprint";
import { ReviewsSection } from "@/sections/ReviewsSection";
import { PaymentSection } from "@/sections/PaymentSection";
import { ContactFooter } from "@/sections/ContactFooter";

import { chatEnabled } from "@/lib/chat/enabled";
import { getContributions } from "@/lib/contributions";
import { getPublicPortfolioData } from "@/lib/db";

// Served from the cache and refreshed at most once a minute; admin edits refresh it at once.
export const revalidate = 60;

export default async function Home() {
  const [{ works, reviews }, contributions] = await Promise.all([
    getPublicPortfolioData(),
    getContributions(),
  ]);

  return (
    <main id="main" tabIndex={-1} className="film-grain vignette outline-none">
      <Hero />
      <WorkGallery works={works} />
      <ContributionsSection items={contributions} />
      <OfferingsSection />
      <ProcessBlueprint />
      <PaymentSection />
      <ReviewsSection reviews={reviews} />
      <ContactFooter briefChat={chatEnabled()} />
    </main>
  );
}
