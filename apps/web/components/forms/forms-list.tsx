"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, MessageSquareText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "@repo/trpc/client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

type FormEntry = NonNullable<RouterOutputs["forms"]["getAllMine"]>[number];

type FormStatus = "all" | "published" | "drafts";

const statusLabels: Record<FormStatus, string> = {
  all: "All",
  published: "Published",
  drafts: "Drafts",
};

export function FormsList({ initialQuery }: { initialQuery?: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState(initialQuery ?? "");
  const [status, setStatus] = useState<FormStatus>("all");
  const [formToDelete, setFormToDelete] = useState<FormEntry | null>(null);

  // Keep the search box in sync when a new query arrives from the navbar search.
  useEffect(() => {
    setSearch(initialQuery ?? "");
  }, [initialQuery]);
  const formsQuery = trpc.forms.getAllMine.useQuery();
  const deleteMutation = trpc.forms.delete.useMutation({
    onSuccess() {
      toast.success("Form deleted");
      utils.forms.getAllMine.invalidate();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase();
    const forms = formsQuery.data ?? [];
    const searched = query
      ? forms.filter(
          (form) =>
            form.title.toLowerCase().includes(query) ||
            form.slug.toLowerCase().includes(query) ||
            form.description?.toLowerCase().includes(query),
        )
      : forms;

    if (status === "published") {
      return searched.filter((form) => form.isPublished);
    }

    if (status === "drafts") {
      return searched.filter((form) => !form.isPublished);
    }

    return searched;
  }, [formsQuery.data, search, status]);

  const counts = useMemo(() => {
    const forms = formsQuery.data ?? [];
    const published = forms.filter((form) => form.isPublished).length;
    return { all: forms.length, published, drafts: forms.length - published };
  }, [formsQuery.data]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Forms</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">Manage your forms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create drafts, publish forms, and return to edit fields any time.
          </p>
        </div>
        <Button asChild className="rounded-2xl">
          <Link href="/dashboard/forms/create">
            <Plus aria-hidden="true" />
            Create form
          </Link>
        </Button>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md sm:flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search forms..."
            className="w-full rounded-2xl bg-card/70 pl-9 backdrop-blur"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "published", "drafts"] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={status === tab ? "default" : "outline"}
              className={cn("rounded-2xl", status !== tab && "bg-card/70 backdrop-blur")}
              onClick={() => setStatus(tab)}
            >
              {statusLabels[tab]}
              <span className="ml-1.5 text-xs opacity-70">{counts[tab]}</span>
            </Button>
          ))}
        </div>
      </div>

      {formsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="rounded-[2rem] bg-card/80">
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredForms.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredForms.map((form) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
            <Card
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/dashboard/forms/${form.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/dashboard/forms/${form.id}`);
                }
              }}
              className="h-full cursor-pointer rounded-[2rem] bg-card/80 shadow-lg backdrop-blur-xl transition hover:border-foreground/30 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="line-clamp-1">{form.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">/{form.slug}</p>
                  </div>
                  <Badge variant={form.isPublished ? "default" : "secondary"} className="rounded-full">
                    {form.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {form.description || "No description yet."}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Visibility</p>
                    <p className="font-medium capitalize">{form.visibility}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responses</p>
                    <p className="font-medium">{form.responseCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(form.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-medium">{formatDate(form.updatedAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-2xl"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/dashboard/forms/${form.id}`);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/dashboard/forms/${form.id}/responses`);
                    }}
                  >
                    <MessageSquareText aria-hidden="true" />
                    Responses
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl"
                    aria-label={`Delete ${form.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setFormToDelete(form);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Empty className="min-h-96 rounded-[2rem] border bg-card/80 backdrop-blur-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{search ? "No matching forms" : "No forms yet"}</EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try a different search term."
                : "Create your first draft and start adding fields."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="rounded-2xl">
              <Link href="/dashboard/forms/create">
                <Plus aria-hidden="true" />
                Create form
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <AlertDialog open={formToDelete !== null} onOpenChange={(open) => !open && setFormToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form?</AlertDialogTitle>
            <AlertDialogDescription>
              “{formToDelete?.title}” and its {formToDelete?.responseCount ?? 0} response
              {formToDelete?.responseCount === 1 ? "" : "s"} will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (formToDelete) {
                  deleteMutation.mutate({ id: formToDelete.id });
                }
                setFormToDelete(null);
              }}
            >
              Delete form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
