import crypto from "node:crypto";
import { cookies } from "next/headers";

import { clientKey } from "@/lib/rateLimit";

import { chatEnabled } from "./agent";
import { chatImageUrl } from "./images";
import { CHAT_LIMITS, CHAT_PRICE } from "./limits";
import { latestThreadFor, saveThread } from "./store";
import { EMPTY_BRIEF, type ChatThread } from "./types";

export const CHAT_COOKIE = "vg_chat";
export const NO_STORE = { "cache-control": "no-store" };

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/** Salted, so the stored value cannot be turned back into an address. */
export const ownerHashFor = (req: Request) =>
  sha256(`${process.env.ADMIN_AUTH_SECRET ?? "chat"}:chat:${clientKey(req)}`).slice(0, 40);

export type ChatState = "none" | "open" | "cooldown" | "locked";

export type Session = {
  ownerHash: string;
  token: string | null;
  state: ChatState;
  /** The visitor's own conversation: open, or just finished and still on cooldown. */
  thread: ChatThread | null;
  retryAfterMs: number;
};

/**
 * Works out where this visitor stands. One conversation per address: while it is open, nobody else
 * on the address can start another, and after it ends the address waits out the cooldown.
 */
export async function readSession(req: Request): Promise<Session> {
  const ownerHash = ownerHashFor(req);
  const token = (await cookies()).get(CHAT_COOKIE)?.value ?? null;
  const now = Date.now();

  let latest = await latestThreadFor(ownerHash);

  // A conversation nobody finished goes quiet; the owner still sees it as unfinished.
  if (latest?.status === "open" && now - Date.parse(latest.updatedAt) > CHAT_LIMITS.idleMs) {
    latest = { ...latest, status: "abandoned", endReason: "No reply for 3 hours", lockedUntil: undefined };
    await saveThread(latest);
  }

  const mine = Boolean(latest && token && sha256(token) === latest.tokenHash);

  if (latest?.status === "open") {
    return mine
      ? { ownerHash, token, state: "open", thread: latest, retryAfterMs: 0 }
      : {
          ownerHash,
          token,
          state: "locked",
          thread: null,
          retryAfterMs: Math.max(0, CHAT_LIMITS.idleMs - (now - Date.parse(latest.updatedAt))),
        };
  }

  if (latest?.resolvedAt) {
    const remaining = CHAT_LIMITS.cooldownMs - (now - Date.parse(latest.resolvedAt));
    if (remaining > 0) {
      return { ownerHash, token, state: "cooldown", thread: mine ? latest : null, retryAfterMs: remaining };
    }
  }

  return { ownerHash, token, state: "none", thread: null, retryAfterMs: 0 };
}

export function newThread(ownerHash: string, token: string, greeting: string): ChatThread {
  const now = new Date().toISOString();
  return {
    id: `t_${crypto.randomUUID()}`,
    ownerHash,
    tokenHash: sha256(token),
    status: "open",
    handled: "new",
    createdAt: now,
    updatedAt: now,
    messages: [{ id: crypto.randomUUID(), role: "assistant", content: greeting, at: now }],
    uploads: [],
    brief: { ...EMPTY_BRIEF },
    awaitingConfirm: false,
    takeover: false,
    steer: [],
    offer: CHAT_PRICE.list,
    lastConcessionTurn: 0,
    styleOffer: CHAT_PRICE.style.list,
    lastStyleConcessionTurn: 0,
    userTurns: 0,
    costUsd: 0,
  };
}

export const newToken = () => crypto.randomBytes(32).toString("base64url");

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24,
});

/** What the browser is allowed to see of a conversation: no hashes, no pricing floor, no internals. */
export function threadView(thread: ChatThread) {
  return {
    messages: thread.messages.map((message) => ({
      id: message.id,
      role: message.role,
      owner: message.by === "owner",
      content: message.content,
      images: (message.images ?? []).map((id) => ({ id, url: chatImageUrl(id) })),
      at: message.at,
    })),
    imagesLeft: Math.max(0, CHAT_LIMITS.images - thread.uploads.length),
    ended: thread.status !== "open",
    /** The owner is replying personally, so the assistant is paused. */
    takeover: Boolean(thread.takeover),
  };
}

export function sessionView(session: Session) {
  return {
    enabled: chatEnabled(),
    state: session.state,
    retryAfterMinutes: Math.max(1, Math.ceil(session.retryAfterMs / 60_000)),
    thread: session.thread ? threadView(session.thread) : null,
  };
}

export type ChatView = ReturnType<typeof sessionView>;
