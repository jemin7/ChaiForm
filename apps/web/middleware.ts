import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Auth.js derives the JWE encryption salt and cookie name from the URL
// protocol: on https the session is stored as "__Secure-authjs.session-token",
// on http (local dev) as "authjs.session-token". getToken's default is the
// non-secure name, which on https would never match and would redirect signed-
// in users in an endless /dashboard -> /login loop. Try both names.
const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

export default async function middleware(req: NextRequest) {
  // The app's protected surfaces all live under /dashboard (forms are at
  // /dashboard/forms); the public form-fill pages at /f/* stay open.
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");

  let token = null;

  for (const cookieName of SESSION_COOKIE_NAMES) {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      cookieName,
    });

    if (token) {
      break;
    }
  }

  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
