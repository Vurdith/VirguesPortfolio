import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { readDb, writeDb } from "@/lib/db";
import type { DbSession } from "@/lib/db";

export const ADMIN_COOKIE_NAME = "pt_admin";
const SESSION_TTL_DAYS = 30;

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

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_TTL_DAYS,
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
  const { token, session } = newSession();

  await writeDb((next) => {
    next.auth.passwordHash = hash;
    next.auth.sessions = [session];
  });

  return { ok: true as const, token };
}

export async function login(password: string) {
  const db = await readDb();
  if (!db.auth.passwordHash) return { ok: false as const, reason: "not_setup" as const };

  const valid = await bcrypt.compare(password, db.auth.passwordHash);
  if (!valid) return { ok: false as const, reason: "invalid" as const };

  const { token, session } = newSession();
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
  const session = db.auth.sessions.find((s) => s.tokenHash === tokenHash) ?? null;
  if (!session) return null;

  // Best-effort touch (don’t block auth on a write).
  void writeDb((next) => {
    const target = next.auth.sessions.find((s) => s.tokenHash === tokenHash);
    if (target) target.lastSeenAt = new Date().toISOString();
  });

  return session;
}



