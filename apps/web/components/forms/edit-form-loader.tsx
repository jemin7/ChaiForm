"use client";

import { notFound } from "next/navigation";

import { FormBuilder } from "~/components/forms/form-builder";
import type { BuilderForm } from "~/components/forms/form-types";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

interface EditFormLoaderProps {
  formId: string;
}

export function EditFormLoader({ formId }: EditFormLoaderProps) {
  const formQuery = trpc.forms.getById.useQuery({ id: formId }, { retry: false });

  if (formQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (formQuery.error) {
    notFound();
  }

  if (!formQuery.data) {
    return null;
  }

  const initialForm: BuilderForm = {
    id: formQuery.data.id,
    title: formQuery.data.title,
    description: formQuery.data.description,
    slug: formQuery.data.slug,
    visibility: formQuery.data.visibility,
    isPublished: formQuery.data.isPublished,
    responseCount: formQuery.data.responseCount,
    notificationsEnabled: formQuery.data.notificationsEnabled,
    notifyEmail: formQuery.data.notifyEmail,
    thankYouMessage: formQuery.data.thankYouMessage ?? null,
    fields: formQuery.data.fields.map((field) => ({
      clientId: field.id,
      id: field.id,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options ?? [],
      maxSelections: field.maxSelections ?? null,
      order: field.order,
    })),
  };

  return <FormBuilder initialForm={initialForm} />;
}
