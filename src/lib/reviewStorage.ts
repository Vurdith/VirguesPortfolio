import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import type { ReviewAttachment } from "@/types/portfolio";
import { ATTACHMENT_ID } from "@/lib/reviewLimits";
import { getR2BucketName, getR2Client, getR2PublicUrl, hasR2Config } from "@/lib/r2/client";

const R2_PREFIX = "reviews/";
// Beside the database file and outside /public: files added to /public after a production build
// are not served, so local images go through the media route instead.
const LOCAL_DIR = path.join(
  path.dirname(process.env.DB_PATH || path.join(process.cwd(), "data", "db.json")),
  "review-uploads",
);

export const isAttachmentId = (value: string) => ATTACHMENT_ID.test(value);

export function attachmentFor(id: string): ReviewAttachment {
  return { id, url: hasR2Config() ? getR2PublicUrl(`${R2_PREFIX}${id}`) : `/api/reviews/media/${id}` };
}

/** Writes a re-encoded image under a fresh random name. */
export async function storeReviewImage(data: Buffer): Promise<ReviewAttachment> {
  const id = `${crypto.randomUUID()}.webp`;

  if (hasR2Config()) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: getR2BucketName(),
        Key: `${R2_PREFIX}${id}`,
        Body: data,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } else {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, id), data);
  }

  return attachmentFor(id);
}

export async function reviewImageExists(id: string): Promise<boolean> {
  if (!isAttachmentId(id)) return false;
  try {
    if (hasR2Config()) {
      await getR2Client().send(new HeadObjectCommand({ Bucket: getR2BucketName(), Key: `${R2_PREFIX}${id}` }));
    } else {
      await fs.access(path.join(LOCAL_DIR, id));
    }
    return true;
  } catch {
    return false;
  }
}

export async function readLocalReviewImage(id: string): Promise<Buffer | null> {
  if (!isAttachmentId(id)) return null;
  try {
    return await fs.readFile(path.join(LOCAL_DIR, id));
  } catch {
    return null;
  }
}

/** Best effort: a file that is already gone, or a storage error, never blocks a moderation action. */
export async function deleteReviewImages(ids: string[]): Promise<void> {
  await Promise.all(
    ids.filter(isAttachmentId).map(async (id) => {
      try {
        if (hasR2Config()) {
          await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: `${R2_PREFIX}${id}` }));
        } else {
          await fs.rm(path.join(LOCAL_DIR, id), { force: true });
        }
      } catch (err) {
        console.error("Could not delete review image:", err);
      }
    }),
  );
}
