import crypto from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import { chatEnabled, runAgentTurn } from "@/lib/chat/agent";
import { emailOwner } from "@/lib/chat/email";
import { finishChat } from "@/lib/chat/finish";
import { CHAT_LIMITS } from "@/lib/chat/limits";
import { mergeConcurrent } from "@/lib/chat/merge";
import { addUsage } from "@/lib/chat/model";
import { NO_STORE, readSession, sessionView } from "@/lib/chat/session";
import { countTurnToday, getThread, saveThread } from "@/lib/chat/store";
import type { ChatMessage } from "@/lib/chat/types";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The model call can take a while, especially with images.
export const maxDuration = 60;

const LOCK_MS = 60_000;
const DAILY_TURN_LIMIT = () => Number(process.env.CHAT_DAILY_LIMIT) || 400;

const Body = z.object({
  message: z.string().max(CHAT_LIMITS.messageChars * 2).default(""),
  images: z.array(z.string().max(80)).max(CHAT_LIMITS.imagesPerMessage).default([]),
});

const fail = (error: string, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...headers } });

const LIMIT_NOTE =
  "That's the limit for this chat, so I've passed everything we covered to Virguê, who will reply through the contact you gave.";

export async function POST(req: Request) {
  if (!chatEnabled()) return fail("The assistant is not available right now. Please use the quote form.", 503);

  const limited = rateLimit("chat-message", clientKey(req), 14, 60 * 1000);
  if (!limited.ok) return fail("You're sending messages too fast.", 429, { "retry-after": String(limited.retryAfterSeconds) });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid message.", 400);
  const content = body.data.message.trim();
  if (content.length > CHAT_LIMITS.messageChars) {
    return fail(`Messages can be up to ${CHAT_LIMITS.messageChars} characters.`, 400);
  }
  if (!content && !body.data.images.length) return fail("Write a message first.", 400);

  const session = await readSession(req);
  if (session.state !== "open" || !session.thread) {
    return fail(session.state === "cooldown" ? "This conversation has ended." : "Start a conversation first.", 409);
  }
  const thread = session.thread;

  const images = [...new Set(body.data.images)];
  if (!images.every((id) => thread.uploads.includes(id))) return fail("Unknown image.", 400);
  if (thread.costUsd >= CHAT_LIMITS.maxCostUsd) return fail("This conversation has reached its limit.", 409);

  // No cap on how long a chat runs, only on how fast: a burst of messages earns a short wait.
  const recent = thread.messages.filter((message) => message.role === "user" && Date.now() - Date.parse(message.at) < CHAT_LIMITS.burstWindowMs);
  if (recent.length >= CHAT_LIMITS.burstMessages) {
    const wait = Math.max(1, Math.ceil((CHAT_LIMITS.burstWindowMs - (Date.now() - Date.parse(recent[0].at))) / 1000));
    return fail("You're sending messages very quickly.", 429, { "retry-after": String(wait) });
  }

  // The owner has taken over: keep the customer's message for them and leave the reply to the owner.
  if (thread.takeover) {
    const sent: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      ...(images.length ? { images } : {}),
      at: new Date().toISOString(),
    };
    thread.messages.push(sent);
    thread.userTurns += 1;
    thread.updatedAt = sent.at;
    mergeConcurrent(thread, await getThread(thread.id));
    await saveThread(thread);
    return NextResponse.json(sessionView({ ...session, thread }), { headers: NO_STORE });
  }

  // One request at a time per conversation; a stale lock from a crashed request expires by itself.
  if (thread.lockedUntil && Date.parse(thread.lockedUntil) > Date.now()) {
    return fail("One moment, I'm still replying to your last message.", 429);
  }

  if ((await countTurnToday()) > DAILY_TURN_LIMIT()) {
    return fail("The assistant is very busy today. Please use the quote form and I'll reply by email.", 503);
  }

  thread.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
  // Touching it lets the owner's live view see that the assistant has started working.
  thread.updatedAt = new Date().toISOString();
  await saveThread(thread);

  const now = new Date().toISOString();
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
    ...(images.length ? { images } : {}),
    at: now,
  };
  const turn = thread.userTurns + 1;

  let result;
  try {
    result = await runAgentTurn(thread, userMessage, turn);
  } catch (err) {
    console.error("Chat turn failed:", err);
    // Nothing was added to the conversation, so the customer can simply send it again. The owner
    // can see what went wrong on the conversation's page.
    thread.lockedUntil = undefined;
    thread.lastError = { at: new Date().toISOString(), message: (err instanceof Error ? err.message : String(err)).slice(0, 400) };
    thread.updatedAt = thread.lastError.at;
    await saveThread(thread);
    return fail("The assistant could not reply. Please try again in a moment.", 502);
  }

  const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: result.reply, json: result.json, ...(result.suggest.length ? { suggest: result.suggest } : {}), ...(result.pay ? { pay: true } : {}), at: new Date().toISOString() };
  thread.messages.push(userMessage, reply);
  thread.userTurns = turn;
  thread.brief = result.brief;
  thread.offer = result.offer;
  thread.lastConcessionTurn = result.lastConcessionTurn;
  thread.styleOffer = result.styleOffer;
  thread.lastStyleConcessionTurn = result.lastStyleConcessionTurn;
  thread.awaitingConfirm = result.awaitingConfirm;
  thread.costUsd = Number((thread.costUsd + result.costUsd).toFixed(6));
  thread.usage = addUsage(thread.usage, result.usage);
  thread.updatedAt = reply.at;
  thread.lockedUntil = undefined;
  thread.lastError = undefined;

  let ended: "confirmed" | "limit" | null = null;
  if (result.resolved) {
    thread.status = "resolved";
    ended = "confirmed";
  } else if (thread.costUsd >= CHAT_LIMITS.maxCostUsd) {
    thread.messages.push({ id: crypto.randomUUID(), role: "assistant", content: LIMIT_NOTE, at: reply.at });
    thread.status = thread.brief.contact ? "resolved" : "abandoned";
    thread.endReason = "Cost limit reached";
    ended = "limit";
  }
  if (ended) thread.resolvedAt = reply.at;

  // Tell the owner as soon as a lead leaves contact details, not only when the chat ends.
  const newLead = Boolean(thread.brief.contact) && !thread.contactNotified;
  if (newLead) thread.contactNotified = true;

  // Fold in anything that arrived while the assistant was replying (an upload, the owner joining).
  mergeConcurrent(thread, await getThread(thread.id));
  await saveThread(thread);

  // Both happen after the customer has their reply, so neither adds to their wait.
  const id = thread.id;
  if (ended) {
    const reason = ended;
    after(() => finishChat(id, reason));
  } else if (newLead) {
    after(() => emailOwner(thread, "contact"));
  }

  const fresh = await readSession(req);
  return NextResponse.json(sessionView({ ...fresh, thread }), { headers: NO_STORE });
}
