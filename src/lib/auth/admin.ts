import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { readDb, writeDb } from "@/lib/db";
import type { DbSession } from "@/lib/db";

export const ADMIN_COOKIE_NAME = "pt_admin";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * SESSION_TTL_DAYS;
const SIGNED_TOKEN_VERSION = "v1";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function newSession(): { token: string; session: DbSession } {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const session: DbSession = {
    id: `s_${crypto.randomUUID()}`,
    tokenHash: sha256(token),
    createdAt: now,
    lastSeenAt: now,
  };
  return { token, session };
}

function signingSecret(passwordHash: string | null) {
  return process.env.ADMIN_AUTH_SECRET || passwordHash;
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function createSignedToken(session: DbSession, passwordHash: string | null) {
  const secret = signingSecret(passwordHash);
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({
      id: session.id,
      createdAt: session.createdAt,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = signPayload(`${SIGNED_TOKEN_VERSION}.${payload}`, secret);

  return `${SIGNED_TOKEN_VERSION}.${payload}.${signature}`;
}

function readSignedToken(token: string, passwordHash: string | null): DbSession | null {
  const secret = signingSecret(passwordHash);
  if (!secret) return null;

  const [version, payload, signature] = token.split(".");
  if (version !== SIGNED_TOKEN_VERSION || !payload || !signature) return null;

  const expected = signPayload(`${version}.${payload}`, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id?: string;
      createdAt?: string;
      exp?: number;
    };

    if (!parsed.id || !parsed.createdAt || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    const now = new Date().toISOString();
    return {
      id: parsed.id,
      tokenHash: sha256(token),
      createdAt: parsed.createdAt,
      lastSeenAt: now,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function isPasswordSet() {
  const db = await readDb();
  return Boolean(db.auth.passwordHash);
}

export async function setupPassword(password: string) {
  const db = await readDb();
  if (db.auth.passwordHash) return { ok: false as const, reason: "already_set" as const };

  const hash = await bcrypt.hash(password, 12);
  const { session } = newSession();

  await writeDb((next) => {
    next.auth.passwordHash = hash;
    next.auth.sessions = [session];
  });

  const token = createSignedToken(session, hash);
  if (!token) return { ok: false as const, reason: "signing_failed" as const };

  return { ok: true as const, token };
}

export async function login(password: string) {
  const db = await readDb();
  if (!db.auth.passwordHash) return { ok: false as const, reason: "not_setup" as const };

  const valid = await bcrypt.compare(password, db.auth.passwordHash);
  if (!valid) return { ok: false as const, reason: "invalid" as const };

  const { session } = newSession();
  const token = createSignedToken(session, db.auth.passwordHash);
  if (!token) return { ok: false as const, reason: "signing_failed" as const };

  await writeDb((next) => {
    next.auth.sessions.unshift(session);
    // Keep it bounded.
    next.auth.sessions = next.auth.sessions.slice(0, 32);
  });

  return { ok: true as const, token };
}

export async function logoutByToken(token: string | undefined) {
  if (!token) return;
  const tokenHash = sha256(token);
  await writeDb((db) => {
    db.auth.sessions = db.auth.sessions.filter((s) => s.tokenHash !== tokenHash);
  });
}

export async function getAdminSession(token: string | undefined): Promise<DbSession | null> {
  if (!token) return null;
  const tokenHash = sha256(token);
  const db = await readDb();
  const signedSession = readSignedToken(token, db.auth.passwordHash);
  if (signedSession) return signedSession;

  const session = db.auth.sessions.find((s) => s.tokenHash === tokenHash) ?? null;
  if (!session) return null;

  // Best-effort touch (don’t block auth on a write).
  void writeDb((next) => {
    const target = next.auth.sessions.find((s) => s.tokenHash === tokenHash);
    if (target) target.lastSeenAt = new Date().toISOString();
  });

  return session;
}



