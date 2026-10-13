import { NextResponse } from "next/server";
import { z } from "zod";
import { SITE } from "@/lib/site";

import { chatEnabled } from "@/lib/chat/agent";
import {
  CHAT_COOKIE,
  NO_STORE,
  cookieOptions,
  newThread,
  newToken,
  readSession,
  sessionView,
} from "@/lib/chat/session";
import { saveThread } from "@/lib/chat/store";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GREETING =
  "Hi, I'm Virguê's AI assistant. Tell me about the interface you need and I'll ask a few questions so I can pass a complete brief to Virguê, who replies to you personally. You can attach reference images too. What are you building?";

const Body = z.object({ turnstileToken: z.string().max(4096).optional() });

const fail = (error: string, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...headers } });

export async function POST(req: Request) {
  if (!chatEnabled()) return fail(`The assistant is not available right now. Email ${SITE.email} instead.`, 503);

  const limited = rateLimit("chat-start", clientKey(req), 6, 60 * 60 * 1000);
  if (!limited.ok) return fail("Too many attempts. Try again later.", 429, { "retry-after": String(limited.retryAfterSeconds) });

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return fail("Invalid request.", 400);

  const session = await readSession(req);
  if (session.state === "open") {
    return NextResponse.json(sessionView(session), { headers: NO_STORE });
  }
  if (session.state === "locked") {
    return NextResponse.json({ ...sessionView(session), error: "A conversation is already open from this connection." }, { status: 429, headers: NO_STORE });
  }
  if (session.state === "cooldown") {
    return NextResponse.json({ ...sessionView(session), error: "Please wait before starting another conversation." }, { status: 429, headers: NO_STORE });
  }

  if (!(await verifyTurnstile(body.data.turnstileToken, clientKey(req)))) {
    return fail("Could not verify you are human. Reload and try again.", 400);
  }

  const token = newToken();
  const thread = newThread(session.ownerHash, token, GREETING);
  try {
    await saveThread(thread);
  } catch (err) {
    console.error("Chat start failed:", err);
    return fail(`Could not start the conversation. Try again, or email ${SITE.email}.`, 503);
  }

  const response = NextResponse.json(
    sessionView({ ...session, state: "open", thread, token, retryAfterMs: 0 }),
    { status: 201, headers: NO_STORE },
  );
  response.cookies.set(CHAT_COOKIE, token, cookieOptions());
  return response;
}
