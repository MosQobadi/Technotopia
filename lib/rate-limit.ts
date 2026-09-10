import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * In-memory fixed-window limiter. This app runs as a single Node process on
 * one VPS (see DEPLOYMENT.md notes in CLAUDE.md) — no multi-instance/serverless
 * deployment, so an in-process Map is sufficient without a shared store like Redis.
 */
const buckets = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, SWEEP_INTERVAL_MS).unref();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * The client's address as Nginx saw it (nginx/conf.d/https.conf.disabled).
 *
 * X-Real-IP first: Nginx sets it to $remote_addr, overwriting whatever the client
 * sent. X-Forwarded-For only as a fallback, and its *last* entry — Nginx appends
 * the address it saw, and every entry before that is whatever the client chose to
 * send, which is how a limiter keyed on the first one gets walked around.
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const lastHop = request.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return lastHop || "unknown";
}
