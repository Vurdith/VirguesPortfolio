import crypto from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { extensionForMime, mimeMatchesKind } from "@/lib/uploads";
import { getR2BucketName, getR2Client, getR2PublicUrl, hasR2Config } from "@/lib/r2/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 250 * 1024 * 1024; // 250MB
const SIGNED_URL_TTL_SECONDS = 60 * 5;

const UploadUrlSchema = z.object({
  kind: z.enum(["image", "video", "poster"]),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(MAX_BYTES),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasR2Config()) {
    return NextResponse.json({ error: "R2 is not configured." }, { status: 501 });
  }

  const parsed = UploadUrlSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const { kind, contentType, size } = parsed.data;
  const ext = extensionForMime(contentType);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
  }

  if (!mimeMatchesKind(contentType, kind)) {
    return NextResponse.json(
      { error: kind === "video" ? "Expected a video." : "Expected an image." },
      { status: 415 },
    );
  }

  const key = `portfolio/${kind}/${kind}_${crypto.randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });

  return NextResponse.json(
    {
      ok: true,
      key,
      uploadUrl,
      publicUrl: getR2PublicUrl(key),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
