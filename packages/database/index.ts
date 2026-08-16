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
    connectionPromise = mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
  }

  return connectionPromise;
}

// Connect on first import so both the API and the Next.js app (NextAuth
// handlers) get a ready connection without explicit setup. The promise is
// cached, so repeated calls in API startup are idempotent.
void connectDatabase().catch((error) => {
  console.error("[database] MongoDB connection failed:", error);
});

export * from "./models/user.model";
export * from "./models/form.model";
export * from "./models/response.model";

export { mongoose };
export default mongoose;
