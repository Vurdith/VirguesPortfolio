import { NextResponse } from "next/server";

import { getPublicReview } from "@/lib/db/reviews";
import { NO_STORE, THREAD_TOKEN_HEADER } from "@/lib/reviewApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One approved review with its thread. The home page is cached, so the thread view loads this for
 * fresh replies. With the reviewer's own token (a header, never the URL) their waiting replies show too.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const review = await getPublicReview(id, req.headers.get(THREAD_TOKEN_HEADER));
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ review }, { headers: NO_STORE });
}
