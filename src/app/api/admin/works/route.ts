import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { after, NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { readDb, writeDb } from "@/lib/db";
import { announceWork } from "@/lib/discordNotify";
import { WorkInputSchema } from "@/lib/validation/work";
import { normalizePieces } from "@/lib/work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Telling Discord subscribers about a new work runs after the reply and can take a while.
export const maxDuration = 60;

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
  const work = normalizePieces({
    id: `w_${crypto.randomUUID()}`,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  });

  // Checked inside the write so two simultaneous creates cannot both claim the slug.
  let slugTaken = false;
  await writeDb((db) => {
    if (db.works.some((w) => w.slug === work.slug)) {
      slugTaken = true;
      return;
    }
    db.works.unshift(work);
  });
  if (slugTaken) {
    return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  revalidatePath("/");
  if (work.published) after(() => announceWork(work));
  return NextResponse.json({ ok: true, id: work.id }, { status: 201 });
}


