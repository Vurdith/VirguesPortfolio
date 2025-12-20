import crypto from "node:crypto";

import type { Rating, Review, Work } from "@/types/portfolio";

import { readDb, writeDb } from "./file";

export async function getPublicWorks(): Promise<Work[]> {
  const db = await readDb();
  return db.works.filter((w) => w.published);
}

export async function getApprovedReviews(): Promise<Review[]> {
  const db = await readDb();
  return db.reviews
    .filter((r) => r.status === "approved")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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



