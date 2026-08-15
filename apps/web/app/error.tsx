"use client";

import { Button } from "~/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-[2rem] border bg-card/80 p-8 text-center shadow-xl backdrop-blur-xl">
        <p className="text-4xl">😵</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Your work is safe — please try again.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground/60">Error ID: {error.digest}</p>
        ) : null}
        <Button className="mt-6 rounded-2xl" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
