import { NextResponse } from "next/server";

import { NO_STORE, readSession, sessionView } from "@/lib/chat/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where this visitor stands: nothing yet, a conversation in progress, waiting out a cooldown, or locked out. */
export async function GET(req: Request) {
  const session = await readSession(req);
  return NextResponse.json(sessionView(session), { headers: NO_STORE });
}
