import crypto from "node:crypto";

import type { PublicReview, QuoteRequest, Work } from "@/types/portfolio";

import { approvedPublicReviews } from "./reviews";
import { readDb, writeDb } from "./store";

export { getApprovedReviews, submitReview } from "./reviews";

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

export async function getPublicWorks(): Promise<Work[]> {
  const db = await readDb();
  return publishedWorks(db.works);
}

export async function getPublicPortfolioData(): Promise<{
  works: Work[];
  reviews: PublicReview[];
}> {
  // A single read serves both lists.
  const db = await readDb();
  return { works: publishedWorks(db.works), reviews: approvedPublicReviews(db.reviews) };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const QUOTES_PER_SENDER_PER_HOUR = 4;
const QUOTES_PER_HOUR_OVERALL = 40;
const IP_HASH_RETENTION_MS = 2 * DAY_MS;

export type SubmitQuoteResult =
  | { status: "created"; quote: QuoteRequest }
  | { status: "duplicate" }
  | { status: "limited" };

/** Strips the internal rate-limit hash before a quote leaves the server. */
export function publicQuote({ ipHash: _ipHash, ...quote }: QuoteRequest): Omit<QuoteRequest, "ipHash"> {
  void _ipHash;
  return quote;
}

/**
 * Stores a quote request. Rate limits and duplicate detection run inside the same write, against the
 * stored requests, so they hold across serverless instances (unlike an in-memory counter).
 */
export async function submitQuote(
  input: Omit<QuoteRequest, "id" | "status" | "createdAt" | "ipHash">,
  senderHash: string,
): Promise<SubmitQuoteResult> {
  const now = Date.now();
  const result: { value: SubmitQuoteResult } = { value: { status: "limited" } };

  await writeDb((db) => {
    // Forget old sender hashes: they only exist to throttle bursts.
    for (const existing of db.quotes) {
      if (existing.ipHash && now - Date.parse(existing.createdAt) > IP_HASH_RETENTION_MS) {
        delete existing.ipHash;
      }
    }

    const lastHour = db.quotes.filter((q) => now - Date.parse(q.createdAt) < HOUR_MS);
    const fromSender = lastHour.filter((q) => q.ipHash === senderHash).length;
    if (fromSender >= QUOTES_PER_SENDER_PER_HOUR || lastHour.length >= QUOTES_PER_HOUR_OVERALL) {
      result.value = { status: "limited" };
      return;
    }

    // The same person sending the same message twice (double click, retry) is stored once.
    const sameIdentity = (q: QuoteRequest) =>
      (input.email && q.email === input.email) ||
      (input.discord && q.discord === input.discord) ||
      (input.x && q.x === input.x);
    const duplicate = db.quotes.some(
      (q) =>
        now - Date.parse(q.createdAt) < DAY_MS && sameIdentity(q) && q.details === input.details,
    );
    if (duplicate) {
      result.value = { status: "duplicate" };
      return;
    }

    const quote: QuoteRequest = {
      id: `q_${crypto.randomUUID()}`,
      ...input,
      status: "new",
      createdAt: new Date(now).toISOString(),
      ipHash: senderHash,
    };
    db.quotes.unshift(quote);
    result.value = { status: "created", quote };
  });

  return result.value;
}
