import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addClientReply } from "@/lib/db/reviews";
import { notifyOwner } from "@/lib/notify";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { AttachmentIdsSchema, NO_STORE, resolveAttachments } from "@/lib/reviewApi";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReplySchema = z.object({
  text: z.string().trim().min(REVIEW_LIMITS.reply.min).max(REVIEW_LIMITS.reply.max),
  /** The thread token returned when the review was submitted. */
  token: z.string().min(20).max(200),
  attachments: AttachmentIdsSchema,
  // Hidden field real visitors never fill in.
  company: z.string().optional(),
  turnstileToken: z.string().max(4096).optional(),
});

const REPLIES_PER_HOUR = 10;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit("review-reply", clientKey(req), REPLIES_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many replies. Try again later." },
      { status: 429, headers: { ...NO_STORE, "retry-after": String(limited.retryAfterSeconds) } },
    );
  }

  const parsed = ReplySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reply." }, { status: 400, headers: NO_STORE });
  }
  const { text, token, company, turnstileToken, attachments: attachmentIds } = parsed.data;

  if (company?.trim()) {
    return NextResponse.json({ ok: true, id: `rp_${crypto.randomUUID()}`, status: "pending" }, { status: 201, headers: NO_STORE });
  }

  if (!(await verifyTurnstile(turnstileToken, clientKey(req)))) {
    return NextResponse.json(
      { error: "Could not verify you are human. Reload and try again." },
      { status: 400, headers: NO_STORE },
    );
  }

  const attachments = await resolveAttachments(attachmentIds);
  if (!attachments) {
    return NextResponse.json({ error: "One of the images is no longer available. Add it again." }, { status: 400, headers: NO_STORE });
  }

  const { id } = await ctx.params;
  const outcome = await addClientReply(id, token, { text, attachments });

  if (outcome.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }
  if (outcome.status === "forbidden") {
    return NextResponse.json({ error: "Only the original reviewer can reply." }, { status: 403, headers: NO_STORE });
  }
  if (outcome.status === "full") {
    return NextResponse.json(
      { error: "You already have replies waiting for approval, or this thread is full." },
      { status: 409, headers: NO_STORE },
    );
  }

  await notifyOwner(
    `New reply from ${outcome.review.name}`,
    [outcome.reply.text, "", `${attachments.length} image(s). Waiting for approval in /admin/reviews.`].join("\n"),
  );

  return NextResponse.json(
    { ok: true, id: outcome.reply.id, status: outcome.reply.status },
    { status: 201, headers: NO_STORE },
  );
}
