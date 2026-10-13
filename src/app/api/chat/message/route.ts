import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { chatEnabled, runAgentTurn } from "@/lib/chat/agent";
import { chatImageLink } from "@/lib/chat/images";
import { CHAT_LIMITS } from "@/lib/chat/limits";
import { NO_STORE, readSession, sessionView } from "@/lib/chat/session";
import { countTurnToday, getThread, saveThread } from "@/lib/chat/store";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";
import { notifyOwner } from "@/lib/notify";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { SITE } from "@/lib/site";

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

function emailFor(thread: ChatThread, reason: "confirmed" | "limit") {
  const { brief } = thread;
  const replica = brief.styleReplication;
  const unit = replica ? thread.styleOffer : thread.offer;
  const total = brief.frames ? `£${(brief.frames * unit).toLocaleString("en-GB")}` : "—";
  const transcript = thread.messages
    .map((message) => `${message.role === "user" ? "CUSTOMER" : "ASSISTANT"}: ${message.content}${message.images?.length ? ` [${message.images.length} image(s)]` : ""}`)
    .join("\n\n")
    .slice(0, 20_000);
  const images = thread.uploads.map(chatImageLink);
  return [
    reason === "confirmed" ? "Confirmed by the customer: that is everything." : "Chat ended at its message limit.",
    "",
    `Name: ${brief.name || "—"}`,
    `Contact: ${brief.contact || "—"}`,
    `Platform: ${brief.platform || "—"}`,
    `Type: ${replica ? "Style replication (matching an existing look)" : "Original design"}`,
    `${replica ? "Tasks" : "Frames"}: ${brief.frames ?? "—"}  ·  Price discussed: £${unit} per ${replica ? "task" : "frame"}  ·  Total: ${total}`,
    `Deadline: ${brief.deadline || "—"}`,
    "",
    "SUMMARY",
    brief.summary || "—",
    "",
    `Project: ${brief.project || "—"}`,
    `Screens: ${brief.screens.join(", ") || "—"}`,
    `Style: ${brief.style || "—"}`,
    `References: ${brief.references || "—"}`,
    `Extras: ${brief.extras || "—"}`,
    ...(images.length ? ["", "REFERENCE IMAGES", ...images] : []),
    "",
    `Full conversation in the admin: ${SITE.url}/admin/briefs`,
    "",
    "TRANSCRIPT",
    transcript,
  ].join("\n");
}

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
  if (thread.userTurns >= CHAT_LIMITS.userMessages) return fail("This conversation has reached its limit.", 409);

  // One request at a time per conversation; a stale lock from a crashed request expires by itself.
  if (thread.lockedUntil && Date.parse(thread.lockedUntil) > Date.now()) {
    return fail("One moment, I'm still replying to your last message.", 429);
  }

  if ((await countTurnToday()) > DAILY_TURN_LIMIT()) {
    return fail("The assistant is very busy today. Please use the quote form and I'll reply by email.", 503);
  }

  thread.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
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
    // Nothing was added to the conversation, so the customer can simply send it again.
    thread.lockedUntil = undefined;
    await saveThread(thread);
    return fail("The assistant could not reply. Please try again in a moment.", 502);
  }

  const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: result.reply, at: new Date().toISOString() };
  thread.messages.push(userMessage, reply);
  thread.userTurns = turn;
  thread.brief = result.brief;
  thread.offer = result.offer;
  thread.lastConcessionTurn = result.lastConcessionTurn;
  thread.styleOffer = result.styleOffer;
  thread.lastStyleConcessionTurn = result.lastStyleConcessionTurn;
  thread.awaitingConfirm = result.awaitingConfirm;
  thread.costUsd = Number((thread.costUsd + result.costUsd).toFixed(6));
  thread.updatedAt = reply.at;
  thread.lockedUntil = undefined;

  let ended: "confirmed" | "limit" | null = null;
  if (result.resolved) {
    thread.status = "resolved";
    ended = "confirmed";
  } else if (turn >= CHAT_LIMITS.userMessages) {
    thread.messages.push({ id: crypto.randomUUID(), role: "assistant", content: LIMIT_NOTE, at: reply.at });
    thread.status = thread.brief.contact ? "resolved" : "abandoned";
    thread.endReason = "Message limit reached";
    ended = "limit";
  }
  if (ended) thread.resolvedAt = reply.at;

  // An image uploaded while the assistant was replying is already stored; keep it.
  const stored = await getThread(thread.id);
  if (stored) thread.uploads = [...new Set([...thread.uploads, ...stored.uploads])];
  await saveThread(thread);

  if (ended) {
    await notifyOwner(
      `New design brief${thread.brief.name ? ` from ${thread.brief.name}` : ""}`,
      emailFor(thread, ended),
    );
  }

  const fresh = await readSession(req);
  return NextResponse.json(sessionView({ ...fresh, thread }), { headers: NO_STORE });
}
