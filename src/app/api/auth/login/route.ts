import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ADMIN_COOKIE_NAME, login, sessionCookieOptions } from "@/lib/auth/admin";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  password: z.string().min(1).max(72),
});

const LOGIN_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limited = rateLimit("login", clientKey(req), LOGIN_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "cache-control": "no-store", "retry-after": String(limited.retryAfterSeconds) },
      },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await login(parsed.data.password);
  if (!result.ok) {
    const status =
      result.reason === "invalid" ? 401 : result.reason === "not_setup" ? 409 : 400;
    return NextResponse.json({ error: "Login failed." }, { status });
  }

  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, sessionCookieOptions());
  return res;
}



