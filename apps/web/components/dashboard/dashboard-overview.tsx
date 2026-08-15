"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, FileText, Plus, Send, Sparkles } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

const MotionLink = motion.create(Link);

export function DashboardOverview() {
  const formsQuery = trpc.forms.getAllMine.useQuery();
  const forms = formsQuery.data ?? [];
  const totalResponses = forms.reduce((sum, form) => sum + Number(form.responseCount ?? 0), 0);
  const published = forms.filter((form) => form.isPublished).length;
  const recentForms = forms.slice(0, 4);
  const hasWellBuiltDraft = forms.some((form) => Number(form.fieldCount ?? 0) >= 3);

  const launchChecklist = [
    { label: "Create a form draft", done: forms.length > 0 },
    { label: "Add at least three fields", done: hasWellBuiltDraft },
    { label: "Publish a form", done: published > 0 },
    { label: "Collect your first response", done: totalResponses > 0 },
  ];

  const checklistDone = launchChecklist.filter((item) => item.done).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <Badge className="rounded-full">
              <Sparkles className="size-3" />
              Workspace live
            </Badge>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Build, publish, and learn from every form.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Your ChaiForm studio brings drafts, response signals, and analytics into one polished workspace.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 rounded-2xl">
                <Link href="/dashboard/forms/create">
                  <Plus className="size-4" />
                  Create form
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl bg-background/70">
                <Link href="/dashboard/analytics">
                  View analytics
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Forms" value={forms.length} icon={FileText} loading={formsQuery.isLoading} href="/dashboard/forms" />
            <Metric label="Responses" value={totalResponses} icon={Send} loading={formsQuery.isLoading} href="/dashboard/forms" />
            <Metric label="Published" value={published} icon={BarChart3} loading={formsQuery.isLoading} href="/dashboard/forms" />
            <Metric label="Drafts" value={forms.length - published} icon={Sparkles} loading={formsQuery.isLoading} href="/dashboard/forms" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Recent forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />)
            ) : recentForms.length ? (
              recentForms.map((form, index) => (
                <MotionLink
                  key={form.id}
                  href={`/dashboard/forms/${form.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{form.title}</p>
                    <p className="text-sm text-muted-foreground">/{form.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={form.isPublished ? "default" : "secondary"} className="rounded-full">
                      {form.isPublished ? "Published" : "Draft"}
                    </Badge>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </MotionLink>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p className="font-medium">No forms yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Create your first form and it will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] bg-foreground text-background shadow-xl dark:bg-white dark:text-black">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Launch checklist</CardTitle>
            <span className="rounded-full bg-background/10 px-2.5 py-1 text-xs font-medium">
              {checklistDone}/{launchChecklist.length}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {launchChecklist.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-2xl p-3 ${
                  item.done ? "bg-emerald-400/10" : "bg-background/10"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
                ) : (
                  <span className="ml-0.5 size-2 shrink-0 rounded-full bg-emerald-400" />
                )}
                <span className={`text-sm ${item.done ? "opacity-70" : ""}`}>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  loading,
  href,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  loading: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border bg-background/60 p-5 shadow-sm transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <Icon className="mb-4 size-5 text-muted-foreground" />
      {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-semibold tabular-nums">{value}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}
