import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ADMIN_COOKIE_NAME, sessionCookieOptions, setupPassword } from "@/lib/auth/admin";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  password: z.string().min(10).max(72),
  setupToken: z.string().max(256).optional(),
});

// First-run setup must prove the caller controls the deployment, otherwise whoever hits this
// route first on a fresh database could claim the admin account.
function setupTokenAllowed(provided: string | undefined) {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!rateLimit("setup", clientKey(req), 10, 15 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid password." }, { status: 400 });
  }

  if (!setupTokenAllowed(parsed.data.setupToken)) {
    return NextResponse.json({ error: "Invalid setup token." }, { status: 403 });
  }

  const result = await setupPassword(parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: "Password already set." }, { status: 409 });
  }

  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, sessionCookieOptions());
  return res;
}



