import { NextResponse } from "next/server";
import { z } from "zod";

import { getApprovedReviews, submitReview } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const ReviewSubmissionSchema = z.object({
  name: z.string().trim().min(REVIEW_LIMITS.name.min).max(REVIEW_LIMITS.name.max),
  rating: RatingSchema,
  text: z.string().trim().min(REVIEW_LIMITS.text.min).max(REVIEW_LIMITS.text.max),
});

export async function GET() {
  const reviews = await getApprovedReviews();
  return NextResponse.json(
    { reviews },
    { headers: { "cache-control": "no-store" } },
  );
}

const REVIEW_SUBMISSIONS_PER_HOUR = 5;

export async function POST(req: Request) {
  const limited = rateLimit("review", clientKey(req), REVIEW_SUBMISSIONS_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      {
        status: 429,
        headers: { "cache-control": "no-store", "retry-after": String(limited.retryAfterSeconds) },
      },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = ReviewSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const review = await submitReview(parsed.data);
  return NextResponse.json(
    { ok: true, id: review.id, status: review.status },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}


