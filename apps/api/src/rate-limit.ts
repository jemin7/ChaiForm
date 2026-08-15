interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory rate limiter. Good for a single API instance; for
 * horizontal scaling replace this with a shared store (e.g. Upstash Redis).
 */
export function createRateLimiter(opts: { windowMs: number; max: number }) {
  return (key: string): boolean => {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return true;
    }

    if (bucket.count >= opts.max) {
      return false;
    }

    bucket.count += 1;
    return true;
  };
}

// Drop expired buckets periodically so the map doesn't grow without bound.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const sweepTimer = setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, SWEEP_INTERVAL_MS);

sweepTimer.unref();
