import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { adminBrief } from "@/lib/chat/admin";
import { getThread } from "@/lib/chat/store";
import { transcriptName, transcriptText } from "@/lib/chat/transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One conversation as a download: `?format=json` for the raw data, otherwise readable text. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const brief = adminBrief(thread);
  const json = req.nextUrl.searchParams.get("format") === "json";
  const body = json ? JSON.stringify(brief, null, 2) : transcriptText(brief);
  return new NextResponse(body, {
    headers: {
      "content-type": `${json ? "application/json" : "text/plain"}; charset=utf-8`,
      "content-disposition": `attachment; filename="${transcriptName(brief, json ? "json" : "txt")}"`,
      "cache-control": "no-store",
    },
  });
}
