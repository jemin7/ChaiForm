import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getToken } from "next-auth/jwt";

import type { User } from "@repo/database";
import { userService } from "@repo/services/user";
import { validateServerEnv } from "@repo/validators/env";

const env = validateServerEnv(process.env);

/** User shape exposed to tRPC procedures — password and internal tokens stripped. */
export type SafeUser = Omit<User, "password" | "emailVerificationToken" | "emailVerificationTokenExpires" | "passwordResetToken" | "passwordResetTokenExpires">;

type ContextOptions = Partial<CreateExpressContextOptions>;

export async function createContext(opts: ContextOptions = {}) {
  // Auth.js derives the JWE encryption salt from the session cookie name.
  // On https the web app mints tokens with "__Secure-authjs.session-token"
  // while on http (local dev) it uses "authjs.session-token". The token
  // reaches us via the Authorization header (the cookie can't cross
  // origins), which carries no cookie-name hint, so try both salts.
  const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

  let token = null;

  if (opts.req) {
    for (const cookieName of SESSION_COOKIE_NAMES) {
      token = await getToken({
        req: {
          headers: {
            cookie: opts.req.headers.cookie ?? "",
            // The web app forwards its session token here when the session
            // cookie cannot cross origins (web and API are separate origins).
            authorization: opts.req.headers.authorization ?? "",
          },
        },
        secret: env.AUTH_SECRET,
        cookieName,
      });

      if (token) {
        break;
      }
    }
  }

  const userId = typeof token?.id === "string" ? token.id : null;
  const user = userId ? await userService.findById(userId) : null;

  // A password change bumps the account's sessionVersion; tokens minted
  // before that carry the old version and must not authenticate anymore.
  // Tokens without a version (minted before this check existed) still work.
  const tokenSessionVersion = typeof token?.sessionVersion === "number" ? token.sessionVersion : null;
  const sessionValid =
    !!user && (tokenSessionVersion === null || user.sessionVersion === tokenSessionVersion);

  // Strip sensitive fields (password hash, reset/verification tokens) before
  // exposing the user to tRPC procedures.
  const safeUser: SafeUser | null = sessionValid && user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        provider: user.provider,
        plan: user.plan,
        emailVerified: user.emailVerified,
        sessionVersion: user.sessionVersion,
        aiCredits: user.aiCredits,
        aiCreditsDay: user.aiCreditsDay,
        createdAt: user.createdAt,
      }
    : null;

  return {
    dbUser: safeUser,
    session: safeUser ? { user: safeUser } : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
