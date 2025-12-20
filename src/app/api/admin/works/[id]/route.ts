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

const WorkPatchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug.")
    .optional(),
  year: z.number().int().min(1970).max(2100).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
  summary: z.string().trim().max(420).optional(),
  published: z.boolean().optional(),
  media: MediaSchema.optional(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = await readDb();
  const work = db.works.find((w) => w.id === id);
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ work }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = WorkPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch." }, { status: 400 });
  }

  const patch = parsed.data;
  const now = new Date().toISOString();

  const db = await readDb();
  const current = db.works.find((w) => w.id === id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const candidate = {
    ...current,
    ...patch,
    media: patch.media ?? current.media,
  };
  if (candidate.published && !candidate.media.src.trim()) {
    return NextResponse.json({ error: "Published works must have media." }, { status: 400 });
  }

  if (patch.slug && db.works.some((w) => w.slug === patch.slug && w.id !== id)) {
    return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  await writeDb((next) => {
    const idx = next.works.findIndex((w) => w.id === id);
    if (idx === -1) return;
    next.works[idx] = { ...next.works[idx], ...patch, updatedAt: now };
  });

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = await readDb();
  if (!db.works.some((w) => w.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeDb((next) => {
    next.works = next.works.filter((w) => w.id !== id);
  });

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}


