import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory rate limiter for server actions. Per-process — for a
 * horizontally scaled deployment replace this with a shared store.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/** Best-effort client IP, respecting a single proxy hop. */
export async function clientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }

  return headersList.get("x-real-ip") ?? "unknown";
}
