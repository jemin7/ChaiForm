import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { persistGoogleUser, userService, verifyCredentials } from "@repo/services";
import { loginSchema } from "@repo/validators/login";

import { env } from "./env";

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
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (!profile?.email) {
        return false;
      }

      const image = typeof profile.picture === "string" ? profile.picture : null;

      await persistGoogleUser({
        name: profile.name ?? profile.email,
        email: profile.email,
        image,
      });

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
          const dbUser = await userService.findByEmail(email);
          token.id = dbUser?.id;
          // Stamp the account's session version so the API can reject tokens
          // issued before a password change.
          token.sessionVersion = dbUser?.sessionVersion ?? 0;
        }

        if (!token.id) {
          token.id = user.id;
        }
      }

      // Safety net for tokens minted before the database user id was stamped.
      if (!token.id) {
        const email = profile?.email ?? token.email;

        if (email) {
          const dbUser = await userService.findByEmail(email);
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
