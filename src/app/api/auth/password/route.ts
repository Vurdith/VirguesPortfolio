import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_COOKIE_NAME,
  changePassword,
  getAdminSession,
  sessionCookieOptions,
} from "@/lib/auth/admin";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(10).max(72),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!rateLimit("password", clientKey(req), 10, 15 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "New password must be 10–72 characters." }, { status: 400 });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: "Choose a different password." }, { status: 400 });
  }

  const result = await changePassword(parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    return result.reason === "invalid"
      ? NextResponse.json({ error: "Current password is wrong." }, { status: 403 })
      : NextResponse.json({ error: "Could not change password." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, sessionCookieOptions());
  return res;
}
