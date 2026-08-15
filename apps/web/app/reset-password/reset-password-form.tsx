"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { resetPasswordAction, type ResetPasswordState } from "./actions";
import { BrandMark } from "~/components/brand/brand-mark";
import { ChessBackground } from "~/components/layout/chess-background";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const initialState: ResetPasswordState = {};
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

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
              <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your reset link is valid for one hour.
              </p>
            </div>
          </div>
          {state.success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="mb-2 size-4" aria-hidden="true" />
              Your password has been updated. You can now sign in with it.
            </div>
          ) : token ? (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with an uppercase letter, lowercase letter, number, and symbol.
              </p>
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Save new password
              </Button>
            </form>
          ) : (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              This reset link is missing its token.{" "}
              <Link href="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
                Request a new one
              </Link>
              .
            </p>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </section>
      </main>
    </ChessBackground>
  );
}
