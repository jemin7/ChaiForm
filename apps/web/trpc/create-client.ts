import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

// The client only ever talks to the same-origin /trpc proxy (see
// app/trpc/[...path]/route.ts), which forwards the session cookie to the API
// server-side. The raw JWT never reaches browser JavaScript.
export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return c({
    url: "/trpc",
  });
};
