import crypto from "node:crypto";

import type { QuoteRequest, Rating, Review, Work } from "@/types/portfolio";

import { readDb, writeDb } from "./store";

const newestFirst = (a: Review, b: Review) => b.createdAt.localeCompare(a.createdAt);

/** Manually ordered works first (lowest order), then the rest newest first. */
export function sortWorks(works: Work[]): Work[] {
  return [...works].sort((a, b) => {
    const aOrder = a.order ?? Number.POSITIVE_INFINITY;
    const bOrder = b.order ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder < bOrder ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function publishedWorks(works: Work[]) {
  return sortWorks(works.filter((work) => work.published));
}

function approvedReviews(reviews: Review[]) {
  return reviews.filter((review) => review.status === "approved").sort(newestFirst);
}

export async function getPublicWorks(): Promise<Work[]> {
  const db = await readDb();
  return publishedWorks(db.works);
}

export async function getApprovedReviews(): Promise<Review[]> {
  const db = await readDb();
  return approvedReviews(db.reviews);
}

export async function getPublicPortfolioData(): Promise<{
  works: Work[];
  reviews: Review[];
}> {
  // A single read serves both lists.
  const db = await readDb();
  return { works: publishedWorks(db.works), reviews: approvedReviews(db.reviews) };
}

export async function submitReview(input: {
  name: string;
  rating: Rating;
  text: string;
}): Promise<Review> {
  const now = new Date().toISOString();
  const review: Review = {
    id: `r_${crypto.randomUUID()}`,
    name: input.name,
    rating: input.rating,
    text: input.text,
    status: "pending",
    createdAt: now,
  };

  await writeDb((db) => {
    db.reviews.unshift(review);
  });

  return review;
}

export async function submitQuote(
  input: Omit<QuoteRequest, "id" | "status" | "createdAt">,
): Promise<QuoteRequest> {
  const quote: QuoteRequest = {
    id: `q_${crypto.randomUUID()}`,
    ...input,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  await writeDb((db) => {
    db.quotes.unshift(quote);
  });

  return quote;
}
