"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "@repo/trpc/client";
import type { AnswerValue } from "@repo/validators/submit-response";

import { FieldInput } from "~/components/forms/field-input";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/trpc/client";

type PublicForm = NonNullable<RouterOutputs["forms"]["getBySlug"]>;

interface PublicFormViewProps {
  slug: string;
}

// Field types whose answers render as a single labeled input, so the label
// can point at it (checkboxes, ratings and file uploads have no single input).
const labelableTypes = new Set(["text", "textarea", "email", "number", "date", "select"]);

export function PublicFormView({ slug }: PublicFormViewProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const formQuery = trpc.forms.getBySlug.useQuery({ slug }, { retry: false });

  const submitMutation = trpc.forms.submit.useMutation({
    onSuccess() {
      setSubmitted(true);
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  if (formQuery.isLoading) {
    return (
      <Card className="mx-auto w-full max-w-2xl rounded-[2rem] bg-card/80 p-8 shadow-xl backdrop-blur-xl">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </Card>
    );
  }

  const form = formQuery.data;

  if (formQuery.error || !form) {
    return (
      <Card className="mx-auto w-full max-w-2xl rounded-[2rem] bg-card/80 p-10 text-center shadow-xl backdrop-blur-xl">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">This form isn&apos;t available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The form may not be published yet, or the link may be wrong.
        </p>
      </Card>
    );
  }

  const visibleFields = form.fields;
  const answeredCount = visibleFields.filter((field) => !isEmpty(answers[field.id] ?? null)).length;
  const requiredCount = visibleFields.filter((field) => field.required).length;
  const progressPercent = visibleFields.length ? (answeredCount / visibleFields.length) * 100 : 0;

  function setAnswer(fieldId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));

    // Clear the inline error as soon as the respondent fixes the field.
    setErrors((current) => {
      if (!current[fieldId]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  function handleSubmit(target: PublicForm) {
    const fieldsToSubmit = target.fields;

    const nextErrors: Record<string, string> = {};
    let firstInvalid: { id: string } | null = null;

    for (const field of fieldsToSubmit) {
      if (field.required && isEmpty(answers[field.id] ?? null)) {
        nextErrors[field.id] = "This question is required.";
        firstInvalid ??= field;
      }
    }

    if (firstInvalid) {
      setErrors(nextErrors);

      // Scroll to and focus the first unanswered required question.
      window.setTimeout(() => {
        const container = document.getElementById(`field-${firstInvalid!.id}`);
        container?.scrollIntoView({ behavior: "smooth", block: "center" });
        container?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
      }, 0);
      return;
    }

    // Honeypot spam trap: silently pretend the response was recorded.
    if (honeypot.trim()) {
      setSubmitted(true);
      return;
    }

    submitMutation.mutate({
      slug,
      honeypot: honeypot.trim() || undefined,
      answers: fieldsToSubmit.map((field) => ({
        fieldId: field.id,
        value: answers[field.id] ?? null,
      })),
    });
  }

  if (submitted) {
    return (
      <Card className="mx-auto w-full max-w-2xl rounded-[2rem] bg-card/80 p-10 text-center shadow-xl backdrop-blur-xl">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Response recorded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {form.thankYouMessage ||
            `Thanks for submitting ${form.title ? `to “${form.title}”` : "the form"} — your answers have been saved.`}
        </p>
        <Button
          className="mt-6 rounded-2xl"
          variant="outline"
          onClick={() => {
            setAnswers({});
            setErrors({});
            setSubmitted(false);
          }}
        >
          Submit another response
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Card className="rounded-[2rem] bg-card/85 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{form.title || "Untitled form"}</h1>
            {form.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>
            ) : null}
          </div>
          <Badge variant="secondary" className="rounded-full">
            {form.fields.length} question{form.fields.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </Card>

      {/* Honeypot spam trap — hidden from real respondents. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="honeypot">Leave this field empty</label>
        <input
          id="honeypot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {form.fields.length ? (
        visibleFields.map((field) => (
          <Card
            key={field.id}
            id={`field-${field.id}`}
            className={`rounded-[2rem] bg-card/85 shadow-lg backdrop-blur-xl ${
              errors[field.id] ? "border-destructive/60" : ""
            }`}
          >
            <CardContent className="p-6">
              <Label
                htmlFor={labelableTypes.has(field.type) ? `field-input-${field.id}` : undefined}
                className="text-base"
              >
                {field.label || "Untitled field"}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              <div className="mt-4">
                <FieldInput
                  id={labelableTypes.has(field.type) ? `field-input-${field.id}` : undefined}
                  field={field}
                  value={answers[field.id] ?? null}
                  onChange={(value) => setAnswer(field.id, value)}
                />
              </div>
              {errors[field.id] ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {errors[field.id]}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="rounded-[2rem] bg-card/85 p-8 text-center shadow-xl backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">This form has no questions yet.</p>
        </Card>
      )}

      <Card className="rounded-[2rem] bg-card/85 p-6 shadow-xl backdrop-blur-xl">
        {visibleFields.length > 1 ? (
          <Progress value={progressPercent} className="mb-5 h-2" aria-label="Form progress" />
        ) : null}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {visibleFields.length > 0 ? (
              <>
                {answeredCount} of {visibleFields.length} answered
                {requiredCount > 0 ? (
                  <>
                    {" "}
                    · <span className="text-destructive">*</span> required
                  </>
                ) : null}
              </>
            ) : null}
          </p>
          <Button
            className="w-full rounded-2xl sm:w-auto"
            onClick={() => handleSubmit(form)}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {submitMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </Card>

      {form.showBranding !== false ? (
        <p className="pb-8 pt-2 text-center text-xs text-muted-foreground">Powered by ChaiForm</p>
      ) : null}
    </div>
  );
}

function isEmpty(value: AnswerValue): boolean {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}
