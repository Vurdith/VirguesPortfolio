import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { readDb, writeDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch." }, { status: 400 });

  const db = await readDb();
  if (!db.reviews.some((r) => r.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeDb((next) => {
    const review = next.reviews.find((r) => r.id === id);
    if (!review) return;
    review.status = parsed.data.status;
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
  if (!db.reviews.some((r) => r.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeDb((next) => {
    next.reviews = next.reviews.filter((r) => r.id !== id);
  });

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}



