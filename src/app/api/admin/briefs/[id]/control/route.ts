import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { adminBrief } from "@/lib/chat/admin";
import { getThread, saveThread } from "@/lib/chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const MAX_NOTES = 8;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("takeover") }),
  z.object({ action: z.literal("release") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("steer"), note: z.string().trim().min(2).max(600) }),
  z.object({ action: z.literal("unsteer"), noteId: z.string().max(80) }),
]);

/**
 * Owner controls on a conversation. takeover/release pause and resume the assistant, steer adds private
 * guidance the assistant follows from its next reply, end closes the chat and starts the visitor's cooldown.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.status !== "open") return NextResponse.json({ error: "This chat has ended." }, { status: 409 });

  const at = new Date().toISOString();
  const command = body.data;

  if (command.action === "takeover") {
    thread.takeover = true;
  } else if (command.action === "release") {
    thread.takeover = false;
  } else if (command.action === "steer") {
    thread.steer = [...(thread.steer ?? []), { id: crypto.randomUUID(), note: command.note, at }].slice(-MAX_NOTES);
  } else if (command.action === "unsteer") {
    thread.steer = (thread.steer ?? []).filter((item) => item.id !== command.noteId);
  } else {
    thread.status = "resolved";
    thread.resolvedAt = at;
    thread.endReason = "Ended by the owner";
    thread.takeover = false;
    thread.messages.push({
      id: crypto.randomUUID(),
      role: "assistant",
      by: "owner",
      content: "Virguê has closed this chat. If you shared a way to reach you, they will reply there.",
      at,
    });
  }
  thread.updatedAt = at;
  await saveThread(thread);

  return NextResponse.json({ brief: adminBrief(thread) }, { headers: NO_STORE });
}
