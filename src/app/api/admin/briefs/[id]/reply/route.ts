import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { adminBrief } from "@/lib/chat/admin";
import { CHAT_LIMITS } from "@/lib/chat/limits";
import { getThread, saveThread } from "@/lib/chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const Body = z.object({ content: z.string().trim().min(1).max(CHAT_LIMITS.messageChars * 3) });

/**
 * The owner writes into a live chat. Doing so takes the chat over: the assistant stays silent until
 * the owner hands it back, so the customer never gets two voices at once.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.status !== "open") return NextResponse.json({ error: "This chat has ended." }, { status: 409 });

  const at = new Date().toISOString();
  thread.messages.push({ id: crypto.randomUUID(), role: "assistant", by: "owner", content: body.data.content, at });
  thread.takeover = true;
  thread.updatedAt = at;
  await saveThread(thread);

  return NextResponse.json({ brief: adminBrief(thread) }, { headers: NO_STORE });
}
