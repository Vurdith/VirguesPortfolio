import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, logoutByToken, sessionCookieOptions } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  await logoutByToken(token);

  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}



