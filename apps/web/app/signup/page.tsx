import { redirect } from "next/navigation";

import { auth } from "@repo/auth";

import { BrandMark } from "~/components/brand/brand-mark";
import { GoogleSignInButton } from "~/components/auth/google-sign-in-button";
import { ChessBackground } from "~/components/layout/chess-background";
import { SignupForm } from "~/components/auth/signup-form";
import { ThemeToggle } from "~/components/theme/theme-toggle";

export default async function SignupPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <ChessBackground className="min-h-screen">
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <section className="w-full max-w-md rounded-[2rem] border bg-card/85 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8">
          <div className="mb-8 space-y-5">
            <BrandMark href="/" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use Google or create a secure email and password account.
              </p>
            </div>
          </div>
          <SignupForm />
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton callbackUrl="/dashboard" />
        </section>
      </main>
    </ChessBackground>
  );
}
