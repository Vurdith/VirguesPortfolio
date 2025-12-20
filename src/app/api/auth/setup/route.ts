import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ADMIN_COOKIE_NAME, sessionCookieOptions, setupPassword } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  password: z.string().min(10).max(72),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid password." }, { status: 400 });
  }

  const result = await setupPassword(parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: "Password already set." }, { status: 409 });
  }

  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, sessionCookieOptions());
  return res;
}



