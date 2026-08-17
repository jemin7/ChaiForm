"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "~/components/brand/brand-mark";
import { ChessBackground } from "~/components/layout/chess-background";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { trpc } from "~/trpc/client";

const freeFeatures = [
  "Unlimited forms and responses",
  "5 AI credits every day",
  "All field types incl. file uploads",
  "QR codes + share links",
  "CSV export",
  "Email notifications",
  "Live analytics",
];

const proFeatures = [
  "Everything in Free",
  "Unlimited AI form generation",
  "Unlimited AI response insights",
  "Remove ChaiForm branding",
  "Priority support",
];

export default function PricingPage() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });

  const plan = meQuery.data?.plan;
  const signedIn = !meQuery.isLoading && !meQuery.isError && meQuery.data != null;

  // Payments aren't wired up yet, so upgrading always refuses server-side.
  // Give immediate, honest feedback instead of firing a failing request.
  const handleUpgradeClick = () => {
    toast.info("Pro is coming soon — payment processing isn't wired up yet.");
  };

  return (
    <ChessBackground className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-5">
          <BrandMark href="/" wordmarkClassName="max-[400px]:hidden" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" className="rounded-2xl bg-background/70 px-3 sm:px-4">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-2xl px-3 sm:px-4">
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Simple pricing. Unlimited forms.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Start free with no response limits. Upgrade to Pro when you want AI to build and analyze your forms.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>
            <Card className="h-full rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <p className="text-4xl font-semibold tracking-tight">
                  $0
                  <span className="text-base font-normal text-muted-foreground"> /forever</span>
                </p>
                <p className="text-sm text-muted-foreground">Everything you need to collect responses.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {freeFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-2xl" variant="outline">
                  <Link href="/signup">Start free</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
            <Card className="h-full rounded-[2rem] border-emerald-500/30 bg-card/80 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl">
              <CardHeader className="relative">
                <Badge className="absolute right-5 top-5 rounded-full bg-emerald-500 text-white">
                  <Sparkles className="mr-1 size-3" aria-hidden="true" />
                  Most popular
                </Badge>
                <CardTitle className="text-xl">Pro</CardTitle>
                <p className="text-4xl font-semibold tracking-tight">
                  $8
                  <span className="text-base font-normal text-muted-foreground"> /month</span>
                </p>
                <p className="text-sm text-muted-foreground">AI builds your forms. AI reads your responses.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {signedIn ? (
                  plan === "pro" ? (
                    <Button disabled className="w-full rounded-2xl">
                      You&apos;re on Pro
                    </Button>
                  ) : (
                    <Button className="w-full rounded-2xl" onClick={handleUpgradeClick}>
                      <Sparkles className="size-4" aria-hidden="true" />
                      Upgrade to Pro
                    </Button>
                  )
                ) : (
                  <Button asChild className="w-full rounded-2xl">
                    <Link href="/signup">Create a free account</Link>
                  </Button>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  Demo upgrade — payment processing is not wired up yet.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Questions? <Link href="/#faq" className="font-medium text-foreground underline underline-offset-4">Read the FAQ</Link> or{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">start building</Link>.
        </p>
      </main>
    </ChessBackground>
  );
}
