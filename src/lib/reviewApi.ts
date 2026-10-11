import crypto from "node:crypto";
import { z } from "zod";

import type { ReviewAttachment } from "@/types/portfolio";
import { REVIEW_ATTACHMENTS } from "@/lib/reviewLimits";
import { attachmentFor, isAttachmentId, reviewImageExists } from "@/lib/reviewStorage";

export const NO_STORE = { "cache-control": "no-store" };

/** Carries the reviewer's thread token. A header, so it never ends up in URLs or logs. */
export const THREAD_TOKEN_HEADER = "x-thread-token";

/** The ids of images returned by the upload endpoint. Anything else is rejected, never fetched. */
export const AttachmentIdsSchema = z
  .array(z.string().max(80))
  .max(REVIEW_ATTACHMENTS.max)
  .optional();

/**
 * Turns uploaded-file ids into attachments. The client never supplies a URL: it is rebuilt here, and
 * each file must really exist in storage, so a submission cannot point at an arbitrary address.
 */
export async function resolveAttachments(ids: string[] | undefined): Promise<ReviewAttachment[] | null> {
  const unique = [...new Set(ids ?? [])];
  if (!unique.every(isAttachmentId)) return null;
  const exists = await Promise.all(unique.map(reviewImageExists));
  if (exists.includes(false)) return null;
  return unique.map(attachmentFor);
}

/** Salted so the stored value cannot be reversed into an address. */
export function senderHashFor(ip: string) {
  return crypto
    .createHash("sha256")
    .update(`${process.env.ADMIN_AUTH_SECRET ?? "review"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}
