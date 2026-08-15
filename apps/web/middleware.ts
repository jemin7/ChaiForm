import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  // The app's protected surfaces all live under /dashboard (forms are at
  // /dashboard/forms); the public form-fill pages at /f/* stay open.
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
