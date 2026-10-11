import crypto from "node:crypto";

import type {
  PublicReview,
  Rating,
  Review,
  ReviewAttachment,
  ReviewReply,
  ReviewStatus,
} from "@/types/portfolio";
import { THREAD_LIMITS } from "@/lib/reviewLimits";

import { readDb, writeDb } from "./store";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const REVIEWS_PER_SENDER_PER_HOUR = 5;
const IP_HASH_RETENTION_MS = 2 * DAY_MS;

const newestFirst = (a: Review, b: Review) => b.createdAt.localeCompare(a.createdAt);
const oldestFirst = (a: ReviewReply, b: ReviewReply) => a.createdAt.localeCompare(b.createdAt);

/** Thread tokens are 256 random bits, so a plain SHA-256 is enough to store them safely. */
export const hashThreadToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const newThreadToken = () => crypto.randomBytes(32).toString("base64url");

function tokenMatches(review: Review, token: string | undefined | null): boolean {
  if (!review.tokenHash || !token || token.length > 200) return false;
  const given = Buffer.from(hashThreadToken(token));
  const stored = Buffer.from(review.tokenHash);
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}

/**
 * What visitors may see: only approved replies, and the reviewer's own waiting replies when they
 * present their thread token. Hashes never leave the server.
 */
export function publicReview(review: Review, token?: string | null): PublicReview {
  const own = tokenMatches(review, token);
  const replies = (review.replies ?? [])
    .filter((reply) => reply.status === "approved" || (own && reply.author === "client" && reply.status === "pending"))
    .sort(oldestFirst)
    .map((reply) => (reply.status === "pending" ? { ...reply, pending: true } : reply));

  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    text: review.text,
    status: review.status,
    createdAt: review.createdAt,
    ...(review.attachments?.length ? { attachments: review.attachments } : {}),
    replies,
  };
}

/** Everything the admin needs to moderate, minus the secrets. */
export function adminReview({ tokenHash: _tokenHash, ipHash: _ipHash, ...review }: Review): Review {
  void _tokenHash;
  void _ipHash;
  return { ...review, replies: [...(review.replies ?? [])].sort(oldestFirst) };
}

export async function getApprovedReviews(): Promise<PublicReview[]> {
  const db = await readDb();
  return approvedPublicReviews(db.reviews);
}

export function approvedPublicReviews(reviews: Review[]): PublicReview[] {
  return reviews
    .filter((review) => review.status === "approved")
    .sort(newestFirst)
    .map((review) => publicReview(review));
}

/** One approved review with its thread, or null (unknown and unapproved look the same). */
export async function getPublicReview(id: string, token?: string | null): Promise<PublicReview | null> {
  const db = await readDb();
  const review = db.reviews.find((r) => r.id === id && r.status === "approved");
  return review ? publicReview(review, token) : null;
}

export type SubmitReviewResult =
  | { status: "created"; review: Review; token: string }
  | { status: "limited" };

export async function submitReview(
  input: { name: string; rating: Rating; text: string; attachments?: ReviewAttachment[] },
  senderHash: string,
): Promise<SubmitReviewResult> {
  const now = Date.now();
  const token = newThreadToken();
  const result: { value: SubmitReviewResult } = { value: { status: "limited" } };

  await writeDb((db) => {
    for (const existing of db.reviews) {
      if (existing.ipHash && now - Date.parse(existing.createdAt) > IP_HASH_RETENTION_MS) delete existing.ipHash;
    }

    const fromSender = db.reviews.filter(
      (r) => r.ipHash === senderHash && now - Date.parse(r.createdAt) < HOUR_MS,
    ).length;
    if (fromSender >= REVIEWS_PER_SENDER_PER_HOUR) return;

    const review: Review = {
      id: `r_${crypto.randomUUID()}`,
      name: input.name,
      rating: input.rating,
      text: input.text,
      status: "pending",
      createdAt: new Date(now).toISOString(),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      tokenHash: hashThreadToken(token),
      ipHash: senderHash,
    };
    db.reviews.unshift(review);
    result.value = { status: "created", review, token };
  });

  return result.value;
}

export type ReplyResult =
  | { status: "created"; review: Review; reply: ReviewReply }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "full" };

/** A follow-up from the reviewer. Waits for approval; needs the token handed out with the review. */
export async function addClientReply(
  reviewId: string,
  token: string,
  input: { text: string; attachments?: ReviewAttachment[] },
): Promise<ReplyResult> {
  const result: { value: ReplyResult } = { value: { status: "not_found" } };

  await writeDb((db) => {
    const review = db.reviews.find((r) => r.id === reviewId && r.status === "approved");
    if (!review) return;
    if (!tokenMatches(review, token)) {
      result.value = { status: "forbidden" };
      return;
    }

    const replies = (review.replies ??= []);
    const waiting = replies.filter((r) => r.author === "client" && r.status === "pending").length;
    if (replies.length >= THREAD_LIMITS.replies || waiting >= THREAD_LIMITS.pendingClientReplies) {
      result.value = { status: "full" };
      return;
    }

    const reply: ReviewReply = {
      id: `rp_${crypto.randomUUID()}`,
      author: "client",
      text: input.text,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    replies.push(reply);
    result.value = { status: "created", review, reply };
  });

  return result.value;
}

/** The owner's reply is public straight away: only the admin can write it. */
export async function addOwnerReply(reviewId: string, text: string): Promise<ReviewReply | "not_found" | "full"> {
  let result: ReviewReply | "not_found" | "full" = "not_found";

  await writeDb((db) => {
    const review = db.reviews.find((r) => r.id === reviewId);
    if (!review) return;
    const replies = (review.replies ??= []);
    if (replies.length >= THREAD_LIMITS.replies) {
      result = "full";
      return;
    }
    const reply: ReviewReply = {
      id: `rp_${crypto.randomUUID()}`,
      author: "owner",
      text,
      status: "approved",
      createdAt: new Date().toISOString(),
    };
    replies.push(reply);
    result = reply;
  });

  return result;
}

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<boolean> {
  let found = false;
  await writeDb((db) => {
    const review = db.reviews.find((r) => r.id === id);
    if (!review) return;
    review.status = status;
    found = true;
  });
  return found;
}

export async function setReplyStatus(reviewId: string, replyId: string, status: ReviewStatus): Promise<boolean> {
  let found = false;
  await writeDb((db) => {
    const reply = db.reviews.find((r) => r.id === reviewId)?.replies?.find((r) => r.id === replyId);
    if (!reply) return;
    reply.status = status;
    found = true;
  });
  return found;
}

export const attachmentIds = (items: { attachments?: ReviewAttachment[] }[]) =>
  items.flatMap((item) => item.attachments?.map((a) => a.id) ?? []);

function stillReferenced(reviews: Review[]) {
  const used = new Set<string>();
  for (const review of reviews) {
    for (const id of attachmentIds([review, ...(review.replies ?? [])])) used.add(id);
  }
  return used;
}

/** Deletes a review, one reply or one attachment. Returns the stored files nothing points to any more. */
export async function removeReviewContent(
  target:
    | { kind: "review"; reviewId: string }
    | { kind: "reply"; reviewId: string; replyId: string }
    | { kind: "attachment"; reviewId: string; replyId?: string; attachmentId: string },
): Promise<{ found: boolean; orphaned: string[] }> {
  let found = false;
  let candidates: string[] = [];
  let used = new Set<string>();

  await writeDb((db) => {
    const review = db.reviews.find((r) => r.id === target.reviewId);
    if (!review) return;

    if (target.kind === "review") {
      candidates = attachmentIds([review, ...(review.replies ?? [])]);
      db.reviews = db.reviews.filter((r) => r.id !== review.id);
      found = true;
    } else if (target.kind === "reply") {
      const reply = review.replies?.find((r) => r.id === target.replyId);
      if (!reply) return;
      candidates = attachmentIds([reply]);
      review.replies = review.replies?.filter((r) => r.id !== reply.id);
      found = true;
    } else {
      const holder = target.replyId ? review.replies?.find((r) => r.id === target.replyId) : review;
      if (!holder?.attachments?.some((a) => a.id === target.attachmentId)) return;
      candidates = [target.attachmentId];
      holder.attachments = holder.attachments.filter((a) => a.id !== target.attachmentId);
      if (!holder.attachments.length) delete holder.attachments;
      found = true;
    }

    used = stillReferenced(db.reviews);
  });

  return { found, orphaned: candidates.filter((id) => !used.has(id)) };
}
