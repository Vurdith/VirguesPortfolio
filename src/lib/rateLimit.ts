import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

export function clientKey(req: NextRequest | Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window, in-memory rate limiter. It is per server instance, so on serverless it is a
 * best-effort brake against bursts (password guessing, review spam), not a hard guarantee.
 */
export function rateLimit(scope: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const id = `${scope}:${key}`;

  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [bucketId, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketId);
    }
  }

  const existing = buckets.get(id);
  if (!existing || existing.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false as const, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true as const };
}
