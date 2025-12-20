import { NextResponse } from "next/server";
import { z } from "zod";

import { getApprovedReviews, submitReview } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const ReviewSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(64),
  rating: RatingSchema,
  text: z.string().trim().min(8).max(420),
});

export async function GET() {
  const reviews = await getApprovedReviews();
  return NextResponse.json(
    { reviews },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: Request) {
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


