import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { getR2BucketName, getR2Client, getR2PublicUrl, hasR2Config } from "@/lib/r2/client";
import { ATTACHMENT_ID } from "@/lib/reviewLimits";
import { SITE } from "@/lib/site";

const R2_PREFIX = "briefs/";
const LOCAL_DIR = path.join(
  path.dirname(process.env.DB_PATH || path.join(process.cwd(), "data", "db.json")),
  "chat-uploads",
);

export const isChatImageId = (value: string) => ATTACHMENT_ID.test(value);

/** Where the browser loads an image from. */
export const chatImageUrl = (id: string) =>
  hasR2Config() ? getR2PublicUrl(`${R2_PREFIX}${id}`) : `/api/chat/media/${id}`;

/** An address the owner can open from an email, so local files get the full site address. */
export const chatImageLink = (id: string) => {
  const url = chatImageUrl(id);
  return url.startsWith("/") ? `${SITE.url}${url}` : url;
};

/** Stores an already re-encoded image under a fresh random name and returns its id. */
export async function storeChatImage(data: Buffer): Promise<string> {
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
  return id;
}

export async function readLocalChatImage(id: string): Promise<Buffer | null> {
  if (!isChatImageId(id)) return null;
  try {
    return await fs.readFile(path.join(LOCAL_DIR, id));
  } catch {
    return null;
  }
}

/**
 * What the model is given for an image: the bytes inline. Handing a provider a public address
 * means it has to fetch it, and storage addresses are often blocked, slow or rate limited for
 * that, which fails the whole reply. The images are small (re-encoded on upload).
 */
export async function chatImageForModel(id: string): Promise<string | null> {
  if (!isChatImageId(id)) return null;
  let bytes: Buffer | null = null;
  if (hasR2Config()) {
    try {
      const object = await getR2Client().send(new GetObjectCommand({ Bucket: getR2BucketName(), Key: `${R2_PREFIX}${id}` }));
      bytes = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : null;
    } catch (err) {
      console.error("Could not read chat image from storage:", err);
      return chatImageUrl(id);
    }
  } else {
    bytes = await readLocalChatImage(id);
  }
  return bytes ? `data:image/webp;base64,${bytes.toString("base64")}` : null;
}

/** Best effort: a missing file never blocks deleting a conversation. */
export async function deleteChatImages(ids: string[]): Promise<void> {
  await Promise.all(
    ids.filter(isChatImageId).map(async (id) => {
      try {
        if (hasR2Config()) {
          await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: `${R2_PREFIX}${id}` }));
        } else {
          await fs.rm(path.join(LOCAL_DIR, id), { force: true });
        }
      } catch (err) {
        console.error("Could not delete chat image:", err);
      }
    }),
  );
}
