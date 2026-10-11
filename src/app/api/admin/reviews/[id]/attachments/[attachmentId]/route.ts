import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { removeReviewContent } from "@/lib/db/reviews";
import { NO_STORE } from "@/lib/reviewApi";
import { deleteReviewImages } from "@/lib/reviewStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Removes one image from a review, or from one of its replies with `?replyId=`. */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await ctx.params;
  const replyId = req.nextUrl.searchParams.get("replyId") ?? undefined;
  const { found, orphaned } = await removeReviewContent({ kind: "attachment", reviewId: id, replyId, attachmentId });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteReviewImages(orphaned);
  revalidatePath("/");
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
