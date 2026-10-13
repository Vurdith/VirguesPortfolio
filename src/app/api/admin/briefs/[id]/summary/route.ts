import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { adminBrief } from "@/lib/chat/admin";
import { getThread } from "@/lib/chat/store";
import { refreshSummary } from "@/lib/chat/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Writing the summary is a model call.
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

/** Writes (or rewrites) the handover summary for a conversation, on the owner's request. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!thread.userTurns) return NextResponse.json({ error: "There is nothing to summarise yet." }, { status: 409 });

  const updated = await refreshSummary(thread, true);
  if (!updated) return NextResponse.json({ error: "Could not write the summary. Try again." }, { status: 502 });
  return NextResponse.json({ brief: adminBrief(updated) }, { headers: NO_STORE });
}
