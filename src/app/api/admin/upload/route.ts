import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KindSchema = z.enum(["image", "video", "poster"]);

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_IMAGE_WIDTH = 2560;

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  return null;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const kindRaw = form.get("kind");
  const kindParsed = KindSchema.safeParse(kindRaw);
  if (!kindParsed.success) {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const ext = extFromMime(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
  }

  if (kindParsed.data !== "video" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Expected an image." }, { status: 415 });
  }
  if (kindParsed.data === "video" && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Expected a video." }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const isVideo = kindParsed.data === "video";
  const output = isVideo
    ? bytes
    : await sharp(bytes)
        .rotate()
        .resize({
          width: MAX_IMAGE_WIDTH,
          height: MAX_IMAGE_WIDTH,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88, effort: 6, smartSubsample: true })
        .toBuffer();
  const filename = `${kindParsed.data}_${crypto.randomUUID()}.${isVideo ? ext : "webp"}`;
  const outDir = path.join(process.cwd(), "public", "uploads");
  const outPath = path.join(outDir, filename);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, output);

  return NextResponse.json(
    { ok: true, path: `/uploads/${filename}` },
    { headers: { "cache-control": "no-store" } },
  );
}



