import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { addOwnerReply } from "@/lib/db/reviews";
import { NO_STORE } from "@/lib/reviewApi";
import { REVIEW_LIMITS } from "@/lib/reviewLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OwnerReplySchema = z.object({
  text: z.string().trim().min(REVIEW_LIMITS.reply.min).max(REVIEW_LIMITS.reply.max),
});

/** The owner's answer in a review's thread. Public immediately, with an OWNER badge. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = OwnerReplySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reply." }, { status: 400 });

  const { id } = await ctx.params;
  const reply = await addOwnerReply(id, parsed.data.text);
  if (reply === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reply === "full") return NextResponse.json({ error: "This thread is full." }, { status: 409 });

  revalidatePath("/");
  return NextResponse.json({ ok: true, reply }, { status: 201, headers: NO_STORE });
}
