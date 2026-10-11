import { NextResponse } from "next/server";

import { clientKey, rateLimit } from "@/lib/rateLimit";
import { NO_STORE } from "@/lib/reviewApi";
import { ImageRejected, reencodeImage } from "@/lib/reviewImages";
import { REVIEW_ATTACHMENTS } from "@/lib/reviewLimits";
import { storeReviewImage } from "@/lib/reviewStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A review can carry 4 images and a few replies, so this is generous but still a brake on abuse.
const UPLOADS_PER_HOUR = 30;
// Multipart framing adds a little to the file itself.
const MAX_REQUEST_BYTES = REVIEW_ATTACHMENTS.maxBytes + 64 * 1024;

const fail = (error: string, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...headers } });

/**
 * One image per request (keeps each call under serverless body limits). The bytes are sniffed and
 * re-encoded, so the client's file name and MIME type are never trusted.
 */
export async function POST(req: Request) {
  const limited = rateLimit("review-upload", clientKey(req), UPLOADS_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) {
    return fail("Too many uploads. Try again later.", 429, { "retry-after": String(limited.retryAfterSeconds) });
  }

  const length = Number(req.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) return fail("Missing content length.", 411);
  if (length > MAX_REQUEST_BYTES) return fail("That image is over 5MB.", 413);
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return fail("Expected a file upload.", 415);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Missing file.", 400);
  if (file.size > REVIEW_ATTACHMENTS.maxBytes) return fail("That image is over 5MB.", 413);

  let data: Buffer;
  try {
    data = await reencodeImage(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof ImageRejected) return fail("Only JPG, PNG, WebP or GIF images are accepted.", 415);
    console.error("Review image processing failed:", err);
    return fail("Could not process that image.", 500);
  }

  try {
    const attachment = await storeReviewImage(data);
    return NextResponse.json({ ok: true, ...attachment }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error("Review image storage failed:", err);
    return fail("Image uploads are unavailable right now.", 503);
  }
}
