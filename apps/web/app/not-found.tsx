import Link from "next/link";

import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-[2rem] border bg-card/80 p-6 text-center shadow-xl backdrop-blur-xl sm:p-8">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Button asChild className="mt-6 rounded-2xl">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
