import { NextResponse } from "next/server";

import { sweepQuietChats } from "@/lib/chat/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Writing summaries calls the model.
export const maxDuration = 60;

/** Daily sweep (Vercel Cron): emails the owner about chats that went quiet. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sweepQuietChats());
}
