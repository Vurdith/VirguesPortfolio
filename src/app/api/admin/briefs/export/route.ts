import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { adminBrief } from "@/lib/chat/admin";
import { listThreads } from "@/lib/chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every conversation in one JSON file, oldest first, for studying how the assistant negotiates. */
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threads = (await listThreads()).reverse();
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(threads.map(adminBrief), null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="chats-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
