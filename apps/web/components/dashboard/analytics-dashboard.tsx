"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, FileText, Send, TrendingUp } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

export function AnalyticsDashboard() {
  const formsQuery = trpc.forms.getAllMine.useQuery();
  const activityQuery = trpc.forms.activity.useQuery();
  const forms = formsQuery.data ?? [];
  const totalResponses = forms.reduce((sum, form) => sum + Number(form.responseCount ?? 0), 0);
  const published = forms.filter((form) => form.isPublished).length;
  const drafts = forms.length - published;
  const topForms = [...forms].sort((a, b) => Number(b.responseCount) - Number(a.responseCount)).slice(0, 5);

  const activity = activityQuery.data ?? [];
  const growthData = activity.slice(-7).map((entry) => ({
    day: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(
      new Date(`${entry.date}T00:00:00Z`),
    ),
    responses: entry.count,
  }));
  const currentWeek = activity.slice(-7).reduce((sum, entry) => sum + entry.count, 0);
  const previousWeek = activity.slice(0, -7).reduce((sum, entry) => sum + entry.count, 0);
  // No baseline means growth is undefined, not 0% — showing "0%" with a busy
  // current week would be misleading.
  const growth =
    previousWeek > 0
      ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100)
      : currentWeek > 0
        ? null
        : 0;
  const pieData = [
    { name: "Published", value: published, fill: "var(--color-chart-1)" },
    { name: "Drafts", value: drafts, fill: "var(--color-chart-2)" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <Badge className="rounded-full">
          <BarChart3 className="size-3" />
          Analytics
        </Badge>
        <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Response intelligence for every form.</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Track workspace growth, submission patterns, top forms, and recent activity from the data already in your forms API.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric label="Total forms" value={forms.length} icon={FileText} loading={formsQuery.isLoading} />
        <AnalyticsMetric label="Total responses" value={totalResponses} icon={Send} loading={formsQuery.isLoading} />
        <AnalyticsMetric label="Published forms" value={published} icon={TrendingUp} loading={formsQuery.isLoading} />
        <AnalyticsMetric label="Growth" value={growth ?? "New"} suffix={growth === null ? "" : "%"} icon={Activity} loading={activityQuery.isLoading} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Submission growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ responses: { label: "Responses", color: "var(--chart-1)" } }} className="h-80 w-full">
              <LineChart data={growthData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="responses" stroke="var(--color-responses)" strokeWidth={3} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Form status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ published: { label: "Published" }, drafts: { label: "Drafts" } }} className="h-80 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={pieData.length ? pieData : [{ name: "No forms", value: 1, fill: "var(--muted)" }]} dataKey="value" innerRadius={68} outerRadius={110} paddingAngle={4}>
                  {(pieData.length ? pieData : [{ fill: "var(--muted)" }]).map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topForms.length ? topForms : forms).slice(0, 5).map((form, index) => (
              <motion.div key={form.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl border bg-background/60 p-4">
                <p className="font-medium">{form.title}</p>
                <p className="text-sm text-muted-foreground">{Number(form.responseCount)} responses</p>
              </motion.div>
            ))}
            {!forms.length && !formsQuery.isLoading ? <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Create forms to start generating activity.</p> : null}
            {formsQuery.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Top forms</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ responses: { label: "Responses", color: "var(--chart-2)" } }} className="h-80 w-full">
              <BarChart data={topForms.map((form) => ({ name: form.title.slice(0, 12), responses: Number(form.responseCount) }))}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="responses" fill="var(--color-responses)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AnalyticsMetric({
  label,
  value,
  suffix = "",
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: typeof FileText;
  loading: boolean;
}) {
  return (
    <Card className="rounded-[2rem] bg-card/80 shadow-lg backdrop-blur-xl">
      <CardContent className="pt-6">
        <Icon className="mb-5 size-5 text-muted-foreground" />
        {loading ? <Skeleton className="h-9 w-20" /> : <p className="text-3xl font-semibold tabular-nums">{value}{suffix}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
