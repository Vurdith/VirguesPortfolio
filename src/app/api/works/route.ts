import { NextResponse } from "next/server";

import { getPublicWorks } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const works = await getPublicWorks();
  return NextResponse.json(
    { works },
    { headers: { "cache-control": "no-store" } },
  );
}



