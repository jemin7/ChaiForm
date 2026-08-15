import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const apiBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  if (!raw) {
    return "http://localhost:8000";
  }

  return raw.replace(/\/+$/, "");
};

async function forward(
  request: NextRequest,
  params: { path: string[] },
  method: "GET" | "POST",
) {
  const { path } = params;
  const url = new URL(request.url);
  const target = `${apiBase()}/trpc/${path.join("/")}${url.search}`;

  const cookieStore = await cookies();
  const token =
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("authjs.session-token")?.value ??
    null;

  const upstream = await fetch(target, {
    method,
    headers: {
      "Content-Type": request.headers.get("Content-Type") ?? "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method === "POST" ? await request.text() : undefined,
    signal: AbortSignal.timeout(60_000),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Same-origin proxy for the tRPC API.
 *
 * The Auth.js session token lives in an httpOnly cookie on the web origin and
 * the API runs on a separate origin, so the token is read here (server-side),
 * forwarded as an `Authorization: Bearer` header, and never exposed to
 * client-side JavaScript.
 *
 * Queries are forwarded as GET (tRPC's default for queries — input travels in
 * the query string), mutations and streaming calls as POST.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, await params, "POST");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, await params, "GET");
}
