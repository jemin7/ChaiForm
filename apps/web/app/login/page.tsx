import { redirect } from "next/navigation";

import { auth } from "@repo/auth";

import { BrandMark } from "~/components/brand/brand-mark";
import { GoogleSignInButton } from "~/components/auth/google-sign-in-button";
import { ChessBackground } from "~/components/layout/chess-background";
import { LoginForm } from "~/components/auth/login-form";
import { sanitizeCallbackUrl } from "~/lib/callback-url";
import { ThemeToggle } from "~/components/theme/theme-toggle";

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const passwordUpdated = params.passwordUpdated === "1";

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <ChessBackground className="min-h-screen">
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <section className="w-full max-w-md rounded-[2rem] border bg-card/85 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="mb-8 space-y-5">
            <BrandMark href="/" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in with Google or your ChaiForm password to continue.
              </p>
            </div>
          </div>
          {passwordUpdated ? (
            <p className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-300">
              Password updated. Sign in with your new password to continue.
            </p>
          ) : null}
          <LoginForm callbackUrl={callbackUrl} />
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton callbackUrl={callbackUrl} />
        </section>
      </main>
    </ChessBackground>
  );
}
