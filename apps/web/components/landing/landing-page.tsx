"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquareQuote,
  Play,
  Sparkles,
  Users,
} from "lucide-react";

import { BrandMark } from "~/components/brand/brand-mark";
import { CompareSection } from "~/components/landing/compare-section";
import { ChessBackground } from "~/components/layout/chess-background";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme/theme-toggle";

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
};

const features = [
  { icon: Sparkles, title: "AI form builder", body: "Describe the form you need and AI builds the questions — then fine-tune them by hand." },
  { icon: FileText, title: "No-code editor", body: "Drag-friendly fields, live previews, drafts, and one-click publishing." },
  { icon: BarChart3, title: "Live analytics", body: "Track responses, question-level charts, and AI insights in one dashboard." },
  { icon: Lock, title: "Secure by default", body: "Authentication, protected routes, and MongoDB persistence stay built in." },
];

const faqs = [
  ["Is ChaiForm free?", "Yes. The Free plan has no response limits. AI features are part of the Pro plan."],
  ["How is this different from Google Forms?", "Google Forms is free but plain, with weak design and no file uploads for everyone. ChaiForm ships polished design, file uploads, AI generation, and email notifications."],
  ["How is this different from Typeform?", "Typeform looks great but caps responses hard — even paid plans pause your form at the limit. ChaiForm keeps the polished experience with unlimited responses."],
  ["Does the builder support drafts?", "Yes. Create drafts, save edits, publish, and return to improve forms later."],
  ["Is this responsive?", "Every main workspace, auth, analytics, and builder surface is designed for mobile, tablet, and desktop."],
];

export function LandingPage() {
  return (
    <ChessBackground className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <BrandMark />
          <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#compare" className="transition hover:text-foreground">Compare</a>
            <Link href="/pricing" className="transition hover:text-foreground">Pricing</Link>
            <a href="#faq" className="transition hover:text-foreground">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" className="hidden rounded-2xl bg-background/70 sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-2xl">
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="size-4 text-emerald-500" />
              Premium forms workspace for modern teams
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Build Smart Forms with ChaiForm
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Create beautiful forms, collect responses, analyze data, and automate workflows.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-2xl px-6">
                <Link href="/signup">
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl bg-background/70 px-6 backdrop-blur">
                <Link href="/pricing">
                  <Play className="size-4" />
                  See pricing
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-sm">
              {["AI builder", "Unlimited responses", "QR + share links"].map((item) => (
                <div key={item} className="rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur">
                  <CheckCircle2 className="mb-2 size-4 text-emerald-500" />
                  <p className="font-medium">{item}</p>
                  <p className="text-muted-foreground">Included</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="rounded-[2rem] border bg-card/80 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-white/5">
              <div className="rounded-[1.5rem] border bg-background p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer discovery</p>
                    <h2 className="text-xl font-semibold">Product feedback</h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                    Published
                  </span>
                </div>
                <div className="space-y-4">
                  {["What should we improve next?", "How satisfied are you?", "Can we follow up?"].map((label, index) => (
                    <div key={label} className="rounded-2xl border bg-card p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">{index + 1}</span>
                        {label}
                      </div>
                      <div className="h-10 rounded-xl border bg-muted/40" />
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[128, 42, 91].map((value, index) => (
                    <div key={value} className="rounded-2xl bg-muted/50 p-3">
                      <p className="text-2xl font-semibold">{value}</p>
                      <p className="text-xs text-muted-foreground">{["responses", "today", "score"][index]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Features</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">Everything a real form product needs.</h2>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <motion.div key={feature.title} {...fadeUp} className="rounded-2xl border bg-card/75 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
                <feature.icon className="mb-5 size-5 text-foreground" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="showcase" className="mx-auto max-w-7xl px-5 py-20">
          <motion.div {...fadeUp} className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Builder showcase</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">Design forms that feel intentional.</h2>
              <p className="mt-4 text-muted-foreground">A focused editor, quick-add field palette, realistic preview, and polished respondent experience.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {["Drag-friendly fields", "Draft and publish", "Responsive preview", "Clean response data"].map((item) => (
                <div key={item} className="rounded-2xl border bg-card/75 p-5 shadow-sm backdrop-blur">
                  <CheckCircle2 className="mb-3 size-5 text-emerald-500" />
                  <p className="font-medium">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section id="analytics" className="mx-auto max-w-7xl px-5 py-20">
          <motion.div {...fadeUp} className="rounded-[2rem] border bg-foreground p-8 text-background shadow-2xl dark:bg-white dark:text-black">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-60">Analytics preview</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight">Know what is working before your next meeting.</h2>
                <p className="mt-4 opacity-70">Response trends, top forms, activity, and channel mix are designed into the workspace.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Total forms", "Responses", "Growth"].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-background/15 bg-background/10 p-5">
                    <p className="text-3xl font-semibold">{[24, 1840, "+18%"][index]}</p>
                    <p className="mt-1 text-sm opacity-70">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <CompareSection />

        <section className="mx-auto grid max-w-7xl gap-4 px-5 py-20 md:grid-cols-3">
          {[
            { icon: Users, title: "Team collaboration", body: "Shared workspace patterns for teams reviewing forms and outcomes." },
            { icon: MessageSquareQuote, title: "Loved by builders", body: "Clean enough for portfolios, fast enough for hackathons, useful enough for demos." },
            { icon: Sparkles, title: "Premium details", body: "Motion, glass surfaces, theme switching, and responsive polish throughout." },
          ].map((item) => (
            <motion.div key={item.title} {...fadeUp} className="rounded-2xl border bg-card/75 p-6 shadow-sm backdrop-blur">
              <item.icon className="mb-4 size-5" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </motion.div>
          ))}
        </section>

        <section id="faq" className="mx-auto max-w-4xl px-5 py-20">
          <motion.div {...fadeUp} className="text-center">
            <h2 className="text-4xl font-semibold tracking-tight">FAQ</h2>
          </motion.div>
          <div className="mt-10 space-y-3">
            {faqs.map(([question, answer]) => (
              <motion.div key={question} {...fadeUp} className="rounded-2xl border bg-card/75 p-6 shadow-sm backdrop-blur">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 pt-10">
          <motion.div {...fadeUp} className="rounded-[2rem] border bg-card/80 p-8 text-center shadow-xl backdrop-blur">
            <h2 className="text-4xl font-semibold tracking-tight">Launch your next form in minutes.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Beautiful forms, unlimited responses, and AI when you need it — free to start.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 rounded-2xl px-6">
              <Link href="/signup">
                Start building
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </motion.div>
        </section>
      </main>
    </ChessBackground>
  );
}
