import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getToken } from "next-auth/jwt";

import { userService } from "@repo/services/user";
import { validateServerEnv } from "@repo/validators/env";

const env = validateServerEnv(process.env);

type ContextOptions = Partial<CreateExpressContextOptions>;

export async function createContext(opts: ContextOptions = {}) {
  const token = opts.req
    ? await getToken({
        req: {
          headers: {
            cookie: opts.req.headers.cookie ?? "",
            // The web app forwards its session token here when the session
            // cookie cannot cross origins (web and API are separate origins).
            authorization: opts.req.headers.authorization ?? "",
          },
        },
        secret: env.AUTH_SECRET,
      })
    : null;

  const userId = typeof token?.id === "string" ? token.id : null;
  const user = userId ? await userService.findById(userId) : null;

  // A password change bumps the account's sessionVersion; tokens minted
  // before that carry the old version and must not authenticate anymore.
  // Tokens without a version (minted before this check existed) still work.
  const tokenSessionVersion = typeof token?.sessionVersion === "number" ? token.sessionVersion : null;
  const sessionValid =
    !!user && (tokenSessionVersion === null || user.sessionVersion === tokenSessionVersion);

  return {
    dbUser: sessionValid ? user : null,
    session: sessionValid && user
      ? {
          user,
        }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
