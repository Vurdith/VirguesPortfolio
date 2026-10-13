import { NextResponse } from "next/server";

import { chatEnabled } from "@/lib/chat/agent";
import { chatImageUrl, storeChatImage } from "@/lib/chat/images";
import { CHAT_LIMITS } from "@/lib/chat/limits";
import { NO_STORE, readSession } from "@/lib/chat/session";
import { addUpload } from "@/lib/chat/store";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { ImageRejected, reencodeImage } from "@/lib/reviewImages";
import { REVIEW_ATTACHMENTS } from "@/lib/reviewLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Multipart framing adds a little to the file itself.
const MAX_REQUEST_BYTES = REVIEW_ATTACHMENTS.maxBytes + 64 * 1024;

const fail = (error: string, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...headers } });

/**
 * One reference image per request. Only a visitor with an open conversation can upload, each
 * conversation takes a few, and the bytes are sniffed and re-encoded like review images.
 */
export async function POST(req: Request) {
  if (!chatEnabled()) return fail("Uploads are unavailable right now.", 503);

  const limited = rateLimit("chat-upload", clientKey(req), 40, 60 * 60 * 1000);
  if (!limited.ok) return fail("Too many uploads. Try again later.", 429, { "retry-after": String(limited.retryAfterSeconds) });

  const length = Number(req.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) return fail("Missing content length.", 411);
  if (length > MAX_REQUEST_BYTES) return fail("That image is over 5MB.", 413);
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) return fail("Expected a file upload.", 415);

  const session = await readSession(req);
  if (session.state !== "open" || !session.thread) return fail("Start a conversation first.", 409);
  const thread = session.thread;
  if (thread.uploads.length >= CHAT_LIMITS.images) {
    return fail(`You can attach up to ${CHAT_LIMITS.images} images in one conversation.`, 409);
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
    console.error("Chat image processing failed:", err);
    return fail("Could not process that image.", 500);
  }

  try {
    const id = await storeChatImage(data);
    await addUpload(thread.id, id);
    return NextResponse.json({ ok: true, id, url: chatImageUrl(id) }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error("Chat image storage failed:", err);
    return fail("Image uploads are unavailable right now.", 503);
  }
}
