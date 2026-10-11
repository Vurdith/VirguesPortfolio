import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getApprovedReviews, submitReview } from "@/lib/db/reviews";
import { notifyOwner } from "@/lib/notify";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { AttachmentIdsSchema, NO_STORE, resolveAttachments, senderHashFor } from "@/lib/reviewApi";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const ReviewSubmissionSchema = z.object({
  name: z.string().trim().min(REVIEW_LIMITS.name.min).max(REVIEW_LIMITS.name.max),
  rating: RatingSchema,
  text: z.string().trim().min(REVIEW_LIMITS.text.min).max(REVIEW_LIMITS.text.max),
  attachments: AttachmentIdsSchema,
  // Hidden field real visitors never fill in.
  company: z.string().optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export async function GET() {
  const reviews = await getApprovedReviews();
  return NextResponse.json({ reviews }, { headers: NO_STORE });
}

const REVIEW_SUBMISSIONS_PER_HOUR = 5;

export async function POST(req: Request) {
  const limited = rateLimit("review", clientKey(req), REVIEW_SUBMISSIONS_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429, headers: { ...NO_STORE, "retry-after": String(limited.retryAfterSeconds) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = ReviewSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400, headers: NO_STORE });
  }
  const { company, turnstileToken, attachments: attachmentIds, ...input } = parsed.data;

  // Bots that fill the hidden field get a success response and nothing is stored.
  if (company?.trim()) {
    return NextResponse.json(
      { ok: true, id: `r_${crypto.randomUUID()}`, status: "pending", token: crypto.randomBytes(32).toString("base64url") },
      { status: 201, headers: NO_STORE },
    );
  }

  const ip = clientKey(req);
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Could not verify you are human. Reload and try again." },
      { status: 400, headers: NO_STORE },
    );
  }

  const attachments = await resolveAttachments(attachmentIds);
  if (!attachments) {
    return NextResponse.json({ error: "One of the images is no longer available. Add it again." }, { status: 400, headers: NO_STORE });
  }

  const outcome = await submitReview({ ...input, attachments }, senderHashFor(ip));
  if (outcome.status === "limited") {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429, headers: { ...NO_STORE, "retry-after": "3600" } },
    );
  }

  const { review, token } = outcome;
  await notifyOwner(
    `New review from ${review.name} (${review.rating}/5)`,
    [review.text, "", `${attachments.length} image(s). Waiting for approval in /admin/reviews.`].join("\n"),
  );

  // The token is shown once and only its hash is stored; the browser keeps it to allow later replies.
  return NextResponse.json(
    { ok: true, id: review.id, status: review.status, token },
    { status: 201, headers: NO_STORE },
  );
}
