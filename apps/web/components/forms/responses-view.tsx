"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Download, FileText, Inbox, Loader2, QrCode, Star } from "lucide-react";
import { useState } from "react";

import type { RouterOutputs } from "@repo/trpc/client";

import { ShareDialog } from "~/components/forms/share-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

type ResponsesData = NonNullable<RouterOutputs["forms"]["getResponses"]>;
type ResponseEntry = ResponsesData["responses"][number];

const RESPONSES_PAGE_SIZE = 10;

interface ResponsesViewProps {
  formId: string;
}

export function ResponsesView({ formId }: ResponsesViewProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected] = useState<ResponseEntry | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const utils = trpc.useUtils();

  const responsesQuery = trpc.forms.getResponses.useQuery(
    { id: formId, page, pageSize: RESPONSES_PAGE_SIZE },
    { retry: false },
  );

  if (responsesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-[2rem]" />
        <Skeleton className="h-40 w-full rounded-[2rem]" />
        <Skeleton className="h-40 w-full rounded-[2rem]" />
      </div>
    );
  }

  const data = responsesQuery.data;

  if (responsesQuery.error || !data) {
    return (
      <Card className="rounded-[2rem] border bg-card/80 p-10 text-center shadow-xl backdrop-blur-xl">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Responses unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This form could not be found, or you don&apos;t have access to it.
        </p>
      </Card>
    );
  }

  const { form, responses, pagination } = data;

  async function exportCsv() {
    setExporting(true);

    try {
      // CSV should contain every response, so fetch all pages.
      const all: ResponseEntry[] = [];
      let currentPage = 1;
      let total = pagination.total;

      while (all.length < total) {
        const pageData = await utils.forms.getResponses.fetch({
          id: formId,
          page: currentPage,
          pageSize: 50,
        });
        all.push(...pageData.responses);
        total = pageData.pagination.total;
        currentPage += 1;
      }

      const labels = [...new Set(all.flatMap((response) => response.answers.map((answer) => answer.label)))];
      const columns = ["Submitted at", ...labels];
      const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const rows = all.map((response) => {
        const byLabel = new Map(response.answers.map((answer) => [answer.label, formatAnswerText(answer.type, answer.value)]));
        return columns
          .map((column, index) =>
            index === 0
              ? escapeCell(new Date(response.submittedAt).toISOString())
              : escapeCell(byLabel.get(column) ?? ""),
          )
          .join(",");
      });

      // Prepend a UTF-8 BOM so Excel renders emojis and accented characters correctly.
      const csv = `\uFEFF${[columns.map(escapeCell).join(","), ...rows].join("\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${form.slug}-responses.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-3 mb-2 text-muted-foreground"
            >
              <Link href={`/dashboard/forms/${form.id}`}>
                <ArrowLeft aria-hidden="true" />
                Back to editor
              </Link>
            </Button>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Responses</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">{form.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={form.isPublished ? "default" : "secondary"} className="rounded-full">
                {form.isPublished ? "Published" : "Draft"}
              </Badge>
              <span className="text-sm text-muted-foreground">/{form.slug}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {pagination.total} response{pagination.total === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pagination.total ? (
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => void exportCsv()}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            ) : null}
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href={`/dashboard/forms/${form.id}/analytics`}>
                <BarChart3 aria-hidden="true" />
                Analytics
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

      {responsesQuery.isFetching ? (
        <div className="space-y-4">
          {Array.from({ length: RESPONSES_PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-[2rem]" />
          ))}
        </div>
      ) : responses.length ? (
        <div className="space-y-4">
          {responses.map((response) => (
            <button
              key={response.id}
              type="button"
              onClick={() => setSelected(response)}
              className="block w-full rounded-[2rem] border border-transparent bg-card/80 text-left shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                  {formatDateTime(response.submittedAt)}
                </CardTitle>
                <span className="text-xs text-muted-foreground">Click to view details</span>
              </CardHeader>
              <CardContent className="space-y-3">
                {response.answers.length ? (
                  response.answers.slice(0, 4).map((answer) => (
                    <div key={answer.fieldId} className="rounded-2xl border bg-background/60 p-4">
                      <p className="text-sm font-medium">{answer.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatAnswer(answer.type, answer.value)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    This submission contained no answers.
                  </p>
                )}
                {response.answers.length > 4 ? (
                  <p className="text-xs text-muted-foreground">
                    +{response.answers.length - 4} more answer{response.answers.length - 4 === 1 ? "" : "s"}
                  </p>
                ) : null}
              </CardContent>
            </button>
          ))}
        </div>
      ) : (
        <Card className="rounded-[2rem] border bg-card/80 p-10 text-center shadow-xl backdrop-blur-xl">
          <Inbox className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-semibold tracking-tight">No responses yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {form.isPublished
              ? "Share the form link to start collecting answers."
              : "Publish this form to get a shareable link."}
          </p>
          {form.isPublished ? (
            <Button className="mt-6 rounded-2xl" onClick={() => setShareOpen(true)}>
              <QrCode aria-hidden="true" />
              Share form
            </Button>
          ) : null}
        </Card>
      )}

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || responsesQuery.isFetching}
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            disabled={page >= pagination.totalPages || responsesQuery.isFetching}
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {selected ? (
        <ResponseDetailDialog response={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function ResponseDetailDialog({ response, onClose }: { response: ResponseEntry; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto rounded-[2rem]">
        <DialogHeader>
          <DialogTitle>Response · {formatDateTime(response.submittedAt)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {response.answers.length ? (
            response.answers.map((answer) => (
              <div key={answer.fieldId} className="rounded-2xl border bg-background/60 p-4">
                <p className="text-sm font-medium">{answer.label}</p>
                <div className="mt-1 text-sm text-muted-foreground">{formatAnswer(answer.type, answer.value)}</div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              This submission contained no answers.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAnswer(type: string, value: string | number | boolean | string[] | Record<string, unknown> | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (type === "rating" && typeof value === "number") {
    return (
      <span className="inline-flex items-center gap-1">
        {value}
        <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
      </span>
    );
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    const file = value as { name?: string; type?: string; size?: number; data?: string };

    if (typeof file.data === "string" && typeof file.name === "string") {
      return (
        <a
          href={file.data}
          download={file.name}
          className="inline-flex max-w-full items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-muted dark:text-emerald-300"
          onClick={(event) => event.stopPropagation()}
        >
          <FileText className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{file.name}</span>
          {typeof file.size === "number" ? (
            <span className="shrink-0 text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
          ) : null}
        </a>
      );
    }

    return "Attached file";
  }

  return String(value);
}

function formatAnswerText(type: string, value: string | number | boolean | string[] | Record<string, unknown> | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join("; ");
  }

  if (typeof value === "object") {
    const file = value as { name?: string };
    return file.name ?? "Attached file";
  }

  return String(value);
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)}MB`;
  }

  if (bytes >= 1_000) {
    return `${Math.round(bytes / 1_000)}KB`;
  }

  return `${bytes}B`;
}
