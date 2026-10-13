import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { adminBrief } from "@/lib/chat/admin";
import { listThreadsSince } from "@/lib/chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Conversations changed since `?since=<ISO time>`. The Briefs page polls this to stay live. */
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = req.nextUrl.searchParams.get("since") ?? "";
  if (since && Number.isNaN(Date.parse(since))) return NextResponse.json({ error: "Invalid time." }, { status: 400 });

  const threads = await listThreadsSince(since);
  return NextResponse.json({ briefs: threads.map(adminBrief) }, { headers: { "cache-control": "no-store" } });
}
