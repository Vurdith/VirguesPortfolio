import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { submitQuote } from "@/lib/db";
import { autoReplyToVisitor, notifyOwner } from "@/lib/notify";
import {
  QUOTE_BUDGETS,
  QUOTE_CONTACTS,
  QUOTE_LIMITS,
  QUOTE_SERVICES,
  cleanHandle,
  isValidContact,
} from "@/lib/quoteLimits";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuoteSchema = z.object({
  name: z.string().trim().min(QUOTE_LIMITS.name.min).max(QUOTE_LIMITS.name.max),
  email: z.string().trim().toLowerCase().max(160).optional(),
  discord: z.string().trim().max(64).optional(),
  x: z.string().trim().max(32).optional(),
  service: z.enum(QUOTE_SERVICES),
  budget: z.enum(QUOTE_BUDGETS),
  deadline: z.string().trim().max(QUOTE_LIMITS.deadline.max),
  details: z.string().trim().min(QUOTE_LIMITS.details.min).max(QUOTE_LIMITS.details.max),
  // Hidden field real visitors never fill in.
  company: z.string().optional(),
  turnstileToken: z.string().max(4096).optional(),
}).superRefine((quote, ctx) => {
  const given = QUOTE_CONTACTS.filter((method) => quote[method]);
  if (!given.length) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Add a way to reach you." });
  }
  for (const method of given) {
    if (!isValidContact(method, quote[method] ?? "")) {
      ctx.addIssue({ code: "custom", path: [method], message: "Invalid contact." });
    }
  }
});

const QUOTES_PER_HOUR = 4;
const NO_STORE = { "cache-control": "no-store" };

export async function POST(req: Request) {
  const limited = rateLimit("quote", clientKey(req), QUOTES_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later, or email directly." },
      { status: 429, headers: { ...NO_STORE, "retry-after": String(limited.retryAfterSeconds) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = QuoteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form and try again." },
      { status: 400, headers: NO_STORE },
    );
  }

  const { company, email, discord, x, turnstileToken, ...rest } = parsed.data;
  const input = {
    ...rest,
    ...(email ? { email } : {}),
    ...(discord ? { discord: cleanHandle(discord) } : {}),
    ...(x ? { x: cleanHandle(x) } : {}),
  };
  // Bots that fill the hidden field get a success response and nothing is stored.
  if (company?.trim()) {
    return NextResponse.json({ ok: true }, { status: 201, headers: NO_STORE });
  }

  const ip = clientKey(req);
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Could not verify you are human. Reload and try again." },
      { status: 400, headers: NO_STORE },
    );
  }

  // Salted so the stored value cannot be reversed into an address.
  const senderHash = crypto
    .createHash("sha256")
    .update(`${process.env.ADMIN_AUTH_SECRET ?? "quote"}:${ip}`)
    .digest("hex")
    .slice(0, 32);

  const outcome = await submitQuote(input, senderHash);
  if (outcome.status === "limited") {
    return NextResponse.json(
      { error: "Too many requests. Try again later, or email directly." },
      { status: 429, headers: { ...NO_STORE, "retry-after": "3600" } },
    );
  }
  // A repeat of a request already received is acknowledged without storing or emailing it again.
  if (outcome.status === "duplicate") {
    return NextResponse.json({ ok: true }, { status: 201, headers: NO_STORE });
  }

  const { quote } = outcome;
  await notifyOwner(
    `New quote request from ${quote.name}`,
    [
      `Name: ${quote.name}`,
      `Email: ${quote.email ?? "—"}`,
      `Discord: ${quote.discord ?? "—"}`,
      `X: ${quote.x ? "@" + quote.x : "—"}`,
      `Service: ${quote.service}`,
      `Budget: ${quote.budget}`,
      `Deadline: ${quote.deadline || "—"}`,
      "",
      quote.details,
    ].join("\n"),
  );

  if (quote.email) await autoReplyToVisitor(quote.email, quote.name);

  return NextResponse.json({ ok: true, id: quote.id }, { status: 201, headers: NO_STORE });
}
