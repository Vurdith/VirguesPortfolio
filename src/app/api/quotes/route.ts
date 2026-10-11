import { NextResponse } from "next/server";
import { z } from "zod";

import { submitQuote } from "@/lib/db";
import { notifyOwner } from "@/lib/notify";
import { QUOTE_BUDGETS, QUOTE_LIMITS, QUOTE_SERVICES } from "@/lib/quoteLimits";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuoteSchema = z.object({
  name: z.string().trim().min(QUOTE_LIMITS.name.min).max(QUOTE_LIMITS.name.max),
  email: z.string().trim().toLowerCase().email().max(160),
  service: z.enum(QUOTE_SERVICES),
  budget: z.enum(QUOTE_BUDGETS),
  deadline: z.string().trim().max(QUOTE_LIMITS.deadline.max),
  details: z.string().trim().min(QUOTE_LIMITS.details.min).max(QUOTE_LIMITS.details.max),
  // Hidden field real visitors never fill in.
  company: z.string().optional(),
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

  const { company, ...input } = parsed.data;
  // Bots that fill the hidden field get a success response and nothing is stored.
  if (company?.trim()) {
    return NextResponse.json({ ok: true }, { status: 201, headers: NO_STORE });
  }

  const quote = await submitQuote(input);
  await notifyOwner(
    `New quote request from ${quote.name}`,
    [
      `Name: ${quote.name}`,
      `Email: ${quote.email}`,
      `Service: ${quote.service}`,
      `Budget: ${quote.budget}`,
      `Deadline: ${quote.deadline || "—"}`,
      "",
      quote.details,
    ].join("\n"),
  );

  return NextResponse.json({ ok: true, id: quote.id }, { status: 201, headers: NO_STORE });
}
