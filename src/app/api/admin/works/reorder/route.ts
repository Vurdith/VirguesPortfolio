import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { writeDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

/** Stores the gallery order: each listed work gets its position in the list as its `order`. */
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ReorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });

  const position = new Map(parsed.data.ids.map((id, index) => [id, index]));
  await writeDb((db) => {
    for (const work of db.works) {
      const index = position.get(work.id);
      if (index !== undefined) work.order = index;
    }
  });

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
