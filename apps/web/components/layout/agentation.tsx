"use client";

import { Agentation } from "agentation";

/**
 * Dev-only annotation toolbar.
 *
 * Next.js statically replaces `process.env.NODE_ENV` at build time, so in
 * production builds this branch (including the import) is removed entirely.
 */
export function DevAgentation() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <Agentation />;
}
