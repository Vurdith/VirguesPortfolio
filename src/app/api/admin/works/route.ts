import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { readDb, writeDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  srcType: z.enum(["upload", "url"]),
  src: z.string().trim().max(2048),
  poster: z.string().trim().optional(),
});

const WorkInputSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug."),
    year: z.number().int().min(1970).max(2100).optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(12),
    summary: z.string().trim().max(420).optional(),
    published: z.boolean(),
    media: MediaSchema,
  })
  .superRefine((v, ctx) => {
    if (v.published && !v.media.src.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["media", "src"],
        message: "Published works must have media.",
      });
    }
  });

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  return NextResponse.json(
    { works: db.works },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = WorkInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid work." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const work = {
    id: `w_${crypto.randomUUID()}`,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  const db = await readDb();
  if (db.works.some((w) => w.slug === work.slug)) {
    return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  await writeDb((next) => {
    next.works.unshift(work);
  });

  return NextResponse.json({ ok: true, id: work.id }, { status: 201 });
}


