import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { removeReviewContent, setReviewStatus } from "@/lib/db/reviews";
import { NO_STORE } from "@/lib/reviewApi";
import { deleteReviewImages } from "@/lib/reviewStorage";

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

  if (!(await setReviewStatus(id, parsed.data.status))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { found, orphaned } = await removeReviewContent({ kind: "review", reviewId: id });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteReviewImages(orphaned);
  revalidatePath("/");
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
