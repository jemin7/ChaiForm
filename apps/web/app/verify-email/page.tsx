import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { verifyEmail } from "@repo/services/auth";

import { BrandMark } from "~/components/brand/brand-mark";
import { ChessBackground } from "~/components/layout/chess-background";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { Button } from "~/components/ui/button";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const result = params.token ? await verifyEmail(params.token) : null;

  return (
    <ChessBackground className="min-h-screen">
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <section className="w-full max-w-md rounded-[2rem] border bg-card/85 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <BrandMark href="/" />
          </div>
          {result?.ok ? (
            <>
              <CheckCircle2 className="mx-auto size-12 text-emerald-500" aria-hidden="true" />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">Email verified</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.email} is now verified. You&apos;re all set.
              </p>
              <Button asChild className="mt-6 rounded-2xl">
                <Link href="/login">Go to sign in</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="mx-auto size-12 text-destructive" aria-hidden="true" />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">Verification failed</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {result?.message ?? "This verification link is missing its token."}
              </p>
              <Button asChild variant="outline" className="mt-6 rounded-2xl">
                <Link href="/">Go home</Link>
              </Button>
            </>
          )}
        </section>
      </main>
    </ChessBackground>
  );
}
