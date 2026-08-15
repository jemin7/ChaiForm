import type { ServerRouter } from "@repo/trpc/client";
import { createTRPCProxyClient, httpBatchStreamLink, httpLink } from "@repo/trpc/client";

const apiUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  if (!raw) {
    return "http://localhost:8000/trpc";
  }

  return `${raw.replace(/\/+$/, "")}/trpc`;
};

// Server-side tRPC client — bypasses the browser-facing proxy (which exists to
// forward the session cookie) and talks to the API directly.
export const api = createTRPCProxyClient<ServerRouter>({
  links: [httpLink({ url: apiUrl() })],
});

export const apiStreaming = createTRPCProxyClient<ServerRouter>({
  links: [httpBatchStreamLink({ url: apiUrl() })],
});
