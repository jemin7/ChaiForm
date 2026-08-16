"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { requestPasswordResetAction, type RequestPasswordResetState } from "./actions";
import { BrandMark } from "~/components/brand/brand-mark";
import { ChessBackground } from "~/components/layout/chess-background";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function ForgotPasswordPage() {
  const initialState: RequestPasswordResetState = {};
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

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
              <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Enter your account email and we&apos;ll send you a link to choose a new password.
              </p>
            </div>
          </div>
          {state.success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="mb-2 size-4" aria-hidden="true" />
              If an account exists for that email, a reset link is on its way. Check your inbox
              (and spam folder).
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Send reset link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </section>
      </main>
    </ChessBackground>
  );
}
