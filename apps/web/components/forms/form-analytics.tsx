"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Inbox, Loader2, MessageSquareText, QrCode, Send, Sparkles, Star, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import type { RouterOutputs } from "@repo/trpc/client";

import { ShareDialog } from "~/components/forms/share-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

type FormAnalyticsData = NonNullable<RouterOutputs["forms"]["getAnalytics"]>;

interface FormAnalyticsProps {
  formId: string;
}

export function FormAnalytics({ formId }: FormAnalyticsProps) {
  const analyticsQuery = trpc.forms.getAnalytics.useQuery({ id: formId }, { retry: false });

  if (analyticsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-[2rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[2rem]" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-[2rem]" />
      </div>
    );
  }

  const data = analyticsQuery.data;

  if (analyticsQuery.error || !data) {
    return (
      <Card className="rounded-[2rem] border bg-card/80 p-10 text-center shadow-xl backdrop-blur-xl">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Analytics unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This form could not be found, or you don&apos;t have access to it.
        </p>
      </Card>
    );
  }

  return <AnalyticsContent data={data} />;
}

function AnalyticsContent({ data }: { data: FormAnalyticsData }) {
  const { form, totalResponses, responsesOverTime, fields } = data;
  const [shareOpen, setShareOpen] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isPro = meQuery.data?.plan === "pro";
  const aiCredits = meQuery.data?.aiCredits;
  const creditsRemaining = aiCredits?.remaining ?? 0;
  const aiExhausted = !isPro && !meQuery.isLoading && creditsRemaining <= 0;

  const summaryMutation = trpc.forms.summarizeResponses.useMutation({
    onSuccess() {
      meQuery.refetch();
    },
    onError() {
      meQuery.refetch();
    },
  });

  const activeDays = responsesOverTime.filter((entry) => entry.count > 0).length;
  const ratingFields = fields.filter((field) => field.averageRating != null);
  const averageRating = ratingFields.length
    ? ratingFields.reduce((sum, field) => sum + (field.averageRating ?? 0), 0) / ratingFields.length
    : null;
  const responseRate =
    totalResponses > 0 && fields.length > 0
      ? Math.round(
          (fields.reduce((sum, field) => sum + field.answerCount, 0) / (totalResponses * fields.length)) * 100,
        )
      : null;

  const trendData = responsesOverTime.map((entry) => ({
    day: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(
      new Date(`${entry.date}T00:00:00Z`),
    ),
    responses: entry.count,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground">
              <Link href={`/dashboard/forms/${form.id}`}>
                <ArrowLeft aria-hidden="true" />
                Back to editor
              </Link>
            </Button>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Analytics</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">{form.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={form.isPublished ? "default" : "secondary"} className="rounded-full">
                {form.isPublished ? "Published" : "Draft"}
              </Badge>
              <span className="text-sm text-muted-foreground">/{form.slug}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{totalResponses} responses</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href={`/dashboard/forms/${form.id}/responses`}>
                <MessageSquareText aria-hidden="true" />
                Responses
              </Link>
            </Button>
            {form.isPublished ? (
              <>
                <Button variant="outline" className="rounded-2xl" onClick={() => setShareOpen(true)}>
                  <QrCode aria-hidden="true" />
                  Share
                </Button>
                <ShareDialog slug={form.slug} title={form.title} open={shareOpen} onOpenChange={setShareOpen} />
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Sparkles className="size-5 text-emerald-500" aria-hidden="true" />
              AI insights
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A plain-language summary of your responses so far.
            </p>
          </div>
          {!summaryMutation.data && totalResponses > 0 ? (
            <div className="flex flex-col items-end gap-2">
              <Button
                className="shrink-0 rounded-2xl"
                onClick={() => summaryMutation.mutate({ id: form.id })}
                disabled={summaryMutation.isPending || aiExhausted}
              >
                {summaryMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-4" aria-hidden="true" />
                )}
                {summaryMutation.isPending ? "Analyzing…" : "Generate summary"}
              </Button>
              {!isPro ? (
                <p className="text-xs text-muted-foreground">
                  {aiExhausted
                    ? "Out of AI credits for today — they reset daily."
                    : `${creditsRemaining} of ${aiCredits?.allowance ?? 5} AI credits left today.`}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        {summaryMutation.data ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl border bg-background/60 p-5 font-sans text-sm leading-6 text-foreground">
            {summaryMutation.data.summary}
          </pre>
        ) : summaryMutation.isError ? (
          <p className="mt-4 text-sm text-destructive">{summaryMutation.error.message}</p>
        ) : totalResponses === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Collect at least one response to unlock AI insights.
          </p>
        ) : summaryMutation.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Analyzing your responses… this usually takes a few seconds.
          </p>
        ) : null}
      </section>

      {totalResponses === 0 ? (
        <Card className="rounded-[2rem] border bg-card/80 p-10 text-center shadow-xl backdrop-blur-xl">
          <Inbox className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-semibold tracking-tight">No responses yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {form.isPublished
              ? "Share the form link to start collecting data — analytics appear as responses arrive."
              : "Publish this form to get a shareable link."}
          </p>
          {form.isPublished ? (
            <Button className="mt-6 rounded-2xl" onClick={() => setShareOpen(true)}>
              <QrCode aria-hidden="true" />
              Share form
            </Button>
          ) : null}
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetric label="Total responses" value={totalResponses} icon={Send} />
            <AnalyticsMetric
              label="Response rate"
              value={responseRate ?? 0}
              suffix="%"
              icon={TrendingUp}
              hint="average fields answered"
            />
            <AnalyticsMetric label="Active days" value={activeDays} suffix={`/${responsesOverTime.length}`} icon={CalendarDays} />
            <AnalyticsMetric
              label="Average rating"
              value={averageRating != null ? averageRating.toFixed(1) : "—"}
              icon={Star}
              hint="across rating fields"
            />
          </section>

          <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Responses over time</CardTitle>
              <p className="text-sm text-muted-foreground">Last {responsesOverTime.length} days</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ responses: { label: "Responses", color: "var(--chart-1)" } }} className="h-80 w-full">
                <LineChart data={trendData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="responses" stroke="var(--color-responses)" strokeWidth={3} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Field breakdown</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                How respondents answered each question.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <Card key={field.fieldId} className="rounded-[2rem] bg-card/80 shadow-lg backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">{field.label || "Untitled field"}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Answered by {field.answerCount} of {totalResponses} responses
                    </p>
                  </CardHeader>
                  <CardContent>
                    {field.options?.length ? (
                      <div>
                        <ChartContainer
                          config={{ count: { label: "Responses", color: "var(--chart-2)" } }}
                          className="h-44 w-full"
                        >
                          <BarChart data={field.options} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="option"
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              tickMargin={8}
                              tickFormatter={(value: string) =>
                                value.length > 14 ? `${value.slice(0, 14)}…` : value
                              }
                            />
                            <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {totalResponses > 0
                            ? `Percentages: ${field.options
                                .map(({ option, count }) => `${option} ${Math.round((count / totalResponses) * 100)}%`)
                                .join(" · ")}`
                            : null}
                        </p>
                      </div>
                    ) : field.ratingDistribution ? (
                      <div className="space-y-2">
                        {[...field.ratingDistribution].reverse().map(({ rating, count }) => (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="flex w-14 items-center gap-1 text-sm tabular-nums">
                              {rating}
                              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                            </span>
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-amber-400"
                                style={{ width: `${totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{count}</span>
                          </div>
                        ))}
                        {field.averageRating != null ? (
                          <p className="pt-1 text-sm text-muted-foreground">
                            Average:{" "}
                            <span className="font-medium text-foreground">{field.averageRating.toFixed(1)}</span> / 5
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Free-text answers — review them in the responses view.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AnalyticsMetric({
  label,
  value,
  suffix = "",
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: typeof Send;
  hint?: string;
}) {
  return (
    <Card className="rounded-[2rem] bg-card/80 shadow-lg backdrop-blur-xl">
      <CardContent className="pt-6">
        <Icon className="mb-5 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-3xl font-semibold tabular-nums">
          {value}
          {suffix}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
