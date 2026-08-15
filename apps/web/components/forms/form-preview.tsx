"use client";

import { useState } from "react";

import type { AnswerValue } from "@repo/validators/submit-response";

import { FieldInput } from "~/components/forms/field-input";
import type { BuilderField } from "~/components/forms/form-types";
import { Label } from "~/components/ui/label";

interface FormPreviewProps {
  title: string;
  description?: string | null;
  fields: BuilderField[];
}

export function FormPreview({ title, description, fields }: FormPreviewProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  return (
    <div className="rounded-[2rem] border bg-card/85 p-4 shadow-xl backdrop-blur-xl sm:p-6">
      <div className="rounded-[1.5rem] border bg-background/80 p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Respondent preview</p>
        <h2 className="text-2xl font-semibold tracking-tight">{title || "Untitled form"}</h2>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-6 space-y-5">
        {fields.length ? (
          fields.map((field) => (
            <div key={field.clientId} className="space-y-3 rounded-2xl border bg-background/70 p-5">
              <Label>
                {field.label || "Untitled field"}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              <FieldInput
                field={field}
                value={answers[field.clientId] ?? null}
                onChange={(value) =>
                  setAnswers((current) => ({ ...current, [field.clientId]: value }))
                }
              />
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add fields to preview the respondent experience.
          </div>
        )}
      </div>
    </div>
  );
}
