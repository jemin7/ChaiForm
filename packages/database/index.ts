import "dotenv/config";
import mongoose from "mongoose";

import { env } from "./env";

// Mongo's driver defaults to 100 connections per pool, and every Vercel
// serverless instance opens its own pool. Atlas free clusters cap total
// connections at 100, so a few warm instances can exhaust the cluster and
// make sign-in fail with a "buffering timed out" error. Cap the pool per
// instance and fail fast instead of buffering for 10s+.
const MONGOOSE_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
};

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase(): Promise<typeof mongoose> {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS).catch((error) => {
      // A failed connection attempt must never poison the module: clear the
      // cached promise so the next caller retries with a fresh connection
      // instead of rethrowing the same stale rejection forever. In serverless
      // this matters because one transient failure (e.g. Atlas's connection
      // limit during a spike) would otherwise permanently break every
      // subsequent sign-in on this instance.
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

// If the connection drops after a successful initial connect (Atlas kills
// idle connections when the pool is saturated), invalidate the cached promise
// so the next connectDatabase() call re-establishes it instead of handing out
// a resolved-but-dead connection.
mongoose.connection.on("disconnected", () => {
  connectionPromise = null;
});
mongoose.connection.on("error", () => {
  connectionPromise = null;
});

const EAGER_RETRY_ATTEMPTS = 5;
const EAGER_RETRY_DELAY_MS = 1_000;

// Connect on first import so both the API and the Next.js app (NextAuth
// handlers) get a ready connection without explicit setup. The promise is
// cached, so repeated calls in API startup are idempotent. On failure (e.g.
// the cluster is briefly over its connection limit), retry with a short
// backoff so the instance heals instead of staying broken for its lifetime.
async function connectWithRetry(): Promise<void> {
  for (let attempt = 1; attempt <= EAGER_RETRY_ATTEMPTS; attempt++) {
    try {
      await connectDatabase();
      return;
    } catch (error) {
      console.error(
        `[database] MongoDB connection failed (attempt ${attempt}/${EAGER_RETRY_ATTEMPTS}):`,
        error,
      );

      if (attempt < EAGER_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, EAGER_RETRY_DELAY_MS * attempt));
      }
    }
  }
}

void connectWithRetry();

export * from "./models/user.model";
export * from "./models/form.model";
export * from "./models/response.model";
export * from "./models/aiUsage.model";

export { mongoose };
export default mongoose;
