import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { writeDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({ status: z.enum(["new", "replied", "closed"]) });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const result = { found: false };
  await writeDb((db) => {
    const quote = db.quotes.find((q) => q.id === id);
    if (!quote) return;
    quote.status = parsed.data.status;
    result.found = true;
  });

  if (!result.found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = { found: false };
  await writeDb((db) => {
    const before = db.quotes.length;
    db.quotes = db.quotes.filter((q) => q.id !== id);
    result.found = db.quotes.length !== before;
  });

  if (!result.found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
