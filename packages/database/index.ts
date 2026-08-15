import "dotenv/config";
import mongoose from "mongoose";

import { env } from "./env";

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase(): Promise<typeof mongoose> {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.MONGODB_URI);
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
