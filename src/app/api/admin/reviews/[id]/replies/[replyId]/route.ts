import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { removeReviewContent, setReplyStatus } from "@/lib/db/reviews";
import { NO_STORE } from "@/lib/reviewApi";
import { deleteReviewImages } from "@/lib/reviewStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({ status: z.enum(["approved", "rejected", "pending"]) });
type Ctx = { params: Promise<{ id: string; replyId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch." }, { status: 400 });

  const { id, replyId } = await ctx.params;
  if (!(await setReplyStatus(id, replyId, parsed.data.status))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, replyId } = await ctx.params;
  const { found, orphaned } = await removeReviewContent({ kind: "reply", reviewId: id, replyId });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteReviewImages(orphaned);
  revalidatePath("/");
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
