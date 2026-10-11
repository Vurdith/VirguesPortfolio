import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { readDb, writeDb } from "@/lib/db";
import { MISSING_MEDIA_MESSAGE, WorkPatchSchema } from "@/lib/validation/work";
import { mergeWork, missingPieceIndex } from "@/lib/work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Validated against the stored work inside the write, so concurrent edits cannot slip past.
  const result: { outcome: "ok" | "missing" | "slug_taken" | "no_media" } = { outcome: "ok" };
  await writeDb((db) => {
    const index = db.works.findIndex((w) => w.id === id);
    if (index === -1) {
      result.outcome = "missing";
      return;
    }

    const candidate = mergeWork(db.works[index], { ...patch, updatedAt: now });
    if (candidate.published && missingPieceIndex(candidate) !== -1) {
      result.outcome = "no_media";
      return;
    }
    if (patch.slug && db.works.some((w) => w.slug === patch.slug && w.id !== id)) {
      result.outcome = "slug_taken";
      return;
    }

    db.works[index] = candidate;
  });

  switch (result.outcome) {
    case "missing":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "no_media":
      return NextResponse.json({ error: MISSING_MEDIA_MESSAGE }, { status: 400 });
    case "slug_taken":
      return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    default:
      revalidatePath("/");
      return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }
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

  revalidatePath("/");
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}


