import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { deleteChatImages } from "@/lib/chat/images";
import { deleteThread, getThread, saveThread } from "@/lib/chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const PatchSchema = z.object({ handled: z.enum(["new", "replied", "closed"]) });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  thread.handled = parsed.data.handled;
  await saveThread(thread);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const removed = await deleteThread(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteChatImages(removed.uploads);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
