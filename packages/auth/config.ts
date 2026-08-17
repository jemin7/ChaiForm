import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { persistGoogleUser, userService, verifyCredentials } from "@repo/services";
import { loginSchema } from "@repo/validators/login";

import { env } from "./env";

// Production safety net for Google OAuth `redirect_uri_mismatch` (Error 400).
// Auth.js builds the Google callback as `${AUTH_URL ?? NEXTAUTH_URL}/api/auth/callback/google`
// and those env vars override the request origin, so a stale localhost value
// (the .env.example default) makes Google reject every sign-in. In production
// we drop a localhost URL and let Auth.js derive the origin from the request,
// so the redirect URI always matches the domain the user is actually on.
if (process.env.NODE_ENV === "production") {
  for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
    const value = process.env[key];
    if (value && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?($|\/)/i.test(value)) {
      console.warn(
        `[auth] Ignoring stale ${key}=${value} in production; OAuth callbacks will use the request origin. ` +
          `Set ${key} to the real deployed HTTPS URL (and register its /api/auth/callback/google in Google Cloud Console) or remove it.`,
      );
      delete process.env[key];
    }
  }
}

// Resolve the database user for a session token with one retry. A transient
// database blip (e.g. Atlas briefly at its connection limit) right after
// sign-in must not fail the whole sign-in, so a single failed lookup is
// retried once before giving up and falling back to `user.id`.
async function findUserByEmailWithRetry(email: string) {
  try {
    return await userService.findByEmail(email);
  } catch (error) {
    console.warn("[auth] Database lookup failed during sign-in, retrying:", error);

    try {
      return await userService.findByEmail(email);
    } catch (retryError) {
      console.error("[auth] Database lookup failed again during sign-in:", retryError);
      return undefined;
    }
  }
}

export const authConfig = {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        try {
          const user = await verifyCredentials(parsed.data);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Where Google sign-in failures land. Auth.js turns both a `false` return
    // and any thrown (non-AuthError) error in this callback into the generic
    // "Access Denied" page, which misleads users when the real cause is a
    // transient database blip. Returning a relative URL instead redirects the
    // user to the app's own login page, which shows a clear message.
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (!profile?.email) {
        console.warn("[auth] Google sign-in rejected: no email in profile", { profile });
        return "/login?error=signin_failed";
      }

      const image = typeof profile.picture === "string" ? profile.picture : null;

      // Persist the Google user with one retry: the first attempt can fail on
      // a transient database blip (e.g. Atlas briefly at its connection
      // limit). upsertGoogleUser is idempotent (keyed on email), so retrying
      // is safe — a retry that finds the user created by a timed-out first
      // attempt just updates it.
      let persisted = false;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await persistGoogleUser({
            name: profile.name ?? profile.email,
            email: profile.email,
            image,
          });
          persisted = true;
          break;
        } catch (error) {
          lastError = error;
          console.error(
            `[auth] persistGoogleUser failed (attempt ${attempt}/2) during Google sign-in:`,
            error,
          );
        }
      }

      if (!persisted) {
        // This is an infrastructure problem, not a permission problem — send
        // the user to the app's login page with a clear message instead of
        // letting Auth.js show the misleading "Access Denied" dead end.
        console.error("[auth] Google sign-in could not persist the user:", lastError);
        return "/login?error=signin_failed";
      }

      return true;
    },
    async jwt({ token, profile, user, trigger, session }) {
      // Persist client-side session updates (e.g. a profile rename) into the
      // JWT so the navbar and settings UI show the new value immediately
      // instead of after a re-login.
      if (trigger === "update" && session && typeof session.name === "string" && session.name) {
        token.name = session.name;
      }

      // On sign-in (`user` is present) always resolve the database user id
      // from the account email. For OAuth providers `user.id` is the
      // provider's id (e.g. the Google sub), which the API cannot look up —
      // the token must carry the database user id instead.
      if (user) {
        const email = user.email ?? profile?.email;

        if (email) {
          const dbUser = await findUserByEmailWithRetry(email);
          token.id = dbUser?.id;
          // Stamp the account's session version so the API can reject tokens
          // issued before a password change.
          token.sessionVersion = dbUser?.sessionVersion ?? 0;
        }

        if (!token.id) {
          // Credentials users carry their database id on `user.id`, so a
          // failed lookup must not fail the whole sign-in.
          token.id = user.id;
        }
      }

      // Safety net for tokens minted before the database user id was stamped.
      if (!token.id) {
        const email = profile?.email ?? token.email;

        if (email) {
          const dbUser = await findUserByEmailWithRetry(email);
          token.id = dbUser?.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret: env.AUTH_SECRET,
} satisfies NextAuthConfig;
