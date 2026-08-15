import express from "express";
import type { NextFunction, Request, Response } from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";
import { createRateLimiter } from "./rate-limit";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "ChaiForm OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

const isProduction = env.NODE_ENV === "production" || env.NODE_ENV === "prod";

// Trust the first hop so req.ip reflects the real client behind a reverse
// proxy or load balancer (used by the rate limiter).
app.set("trust proxy", 1);

// CORS is enabled in every environment: when the web app and API are served
// from different origins (the default setup, web on 3000 and API on 8000) the
// browser requires these headers, and when they share an origin the headers
// are harmless.
app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  }),
);

// File uploads arrive as base64 inside the JSON body (up to 4MB files), so the
// default 100kb body limit would reject them with a 413. The validators still
// enforce the real per-file caps.
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  return res.json({ message: "ChaiForm API is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "ChaiForm server is healthy", healthy: true });
});

// API docs expose the full request/response schema and are useful for
// debugging, but in production they leak internal details — keep them dev-only.
if (!isProduction) {
  logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
  app.get("/openapi.json", (req, res) => {
    return res.json(openApiDocument);
  });

  logger.debug(`docs: ${env.BASE_URL}/docs`);
  app.use("/docs", apiReference({ url: "/openapi.json" }));
}

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.get("/trpc", (req, res) => {
  return res.json({
    message: "The /trpc endpoint is for tRPC POST requests only. Open the web app at http://localhost:3000 to use the UI.",
  });
});

// --- Rate limiting ---------------------------------------------------------
// Per-IP fixed windows for the abuse-prone procedures. In-memory is fine for a
// single instance; move to a shared store before scaling horizontally.
const generalLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const signupLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });

const TRPC_LIMITS: Record<string, { check: (key: string) => boolean; hint: string }> = {
  "forms.submit": {
    check: (key) => generalLimiter(key),
    hint: "Too many submissions. Please try again shortly.",
  },
  "forms.generateWithAI": {
    check: (key) => aiLimiter(key),
    hint: "Too many AI requests. Please try again shortly.",
  },
  "forms.summarizeResponses": {
    check: (key) => aiLimiter(key),
    hint: "Too many AI requests. Please try again shortly.",
  },
  "auth.signup": {
    check: (key) => signupLimiter(key),
    hint: "Too many signup attempts. Please try again later.",
  },
};

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0]!.trim();
  }

  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function rateLimitTrpc(req: Request, res: Response, next: NextFunction) {
  const body = req.body as unknown;
  const entries = Array.isArray(body) ? body : [body];
  const ip = clientIp(req);

  for (const entry of entries) {
    const path = (entry as { path?: unknown } | undefined)?.path;

    if (typeof path !== "string") {
      continue;
    }

    const rule = TRPC_LIMITS[path];

    if (rule && !rule.check(`${ip}:${path}`)) {
      res.status(429).json({ error: { message: rule.hint } });
      return;
    }
  }

  next();
}

app.use(
  "/trpc",
  rateLimitTrpc,
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
