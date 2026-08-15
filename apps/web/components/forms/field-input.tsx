"use client";

import { FileUp, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { FieldType } from "@repo/validators";
import type { AnswerValue, FileAnswer } from "@repo/validators/submit-response";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

const MAX_FILE_SIZE = 4_000_000;

interface FieldInputProps {
  field: {
    type: FieldType;
    placeholder?: string | null;
    options?: string[] | null;
    maxSelections?: number | null;
  };
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Optional id forwarded to the underlying input so labels can target it. */
  id?: string;
}

export function FieldInput({ field, value, onChange, id }: FieldInputProps) {
  switch (field.type) {
    case "file":
      return <FileUploadInput value={value} onChange={onChange} />;
    case "textarea":
      return (
        <Textarea
          id={id}
          placeholder={field.placeholder ?? undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "select":
      return field.maxSelections && field.maxSelections > 1 ? (
        <MultiChoiceInput
          options={field.options ?? []}
          value={value}
          maxSelections={field.maxSelections}
          onChange={onChange}
        />
      ) : (
        <select
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
          className="h-11 w-full rounded-2xl border bg-background px-4 text-sm"
        >
          <option value="">{field.placeholder || "Choose an option"}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <MultiChoiceInput
          options={field.options ?? []}
          value={value}
          maxSelections={field.maxSelections ?? null}
          onChange={onChange}
        />
      );
    case "rating":
      return (
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, index) => {
            const rating = index + 1;
            const active = typeof value === "number" && value >= rating;

            return (
              <button
                key={rating}
                type="button"
                aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                onClick={() => onChange(rating)}
                className="rounded-lg p-1 transition hover:scale-110"
              >
                <Star
                  className={`size-7 ${active ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      );
    case "date":
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          placeholder={field.placeholder ?? undefined}
          value={typeof value === "number" ? value : ""}
          onChange={(event) => {
            const parsed = event.target.value === "" ? null : Number(event.target.value);
            onChange(parsed);
          }}
        />
      );
    case "email":
      return (
        <Input
          id={id}
          type="email"
          placeholder={field.placeholder ?? undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "text":
    default:
      return (
        <Input
          id={id}
          placeholder={field.placeholder ?? undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

function MultiChoiceInput({
  options,
  value,
  maxSelections,
  onChange,
}: {
  options: string[];
  value: AnswerValue;
  maxSelections: number | null;
  onChange: (value: AnswerValue) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  const atLimit = maxSelections !== null && selected.length >= maxSelections;

  function toggle(option: string, checked: boolean) {
    if (checked) {
      if (atLimit) {
        return;
      }

      onChange([...selected, option]);
      return;
    }

    onChange(selected.filter((entry) => entry !== option));
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selected.includes(option);

        return (
          <label key={option} className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={isSelected}
              disabled={!isSelected && atLimit}
              onCheckedChange={(checked) => toggle(option, checked === true)}
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}

function FileUploadInput({
  value,
  onChange,
}: {
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const file = isFileAnswer(value) ? value : null;

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Files must be 4MB or smaller.");
      return;
    }

    setReading(true);

    try {
      const data = await readAsDataURL(file);
      onChange({ name: file.name, type: file.type, size: file.size, data });
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileUp className="size-5 shrink-0 text-emerald-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(null)}
            aria-label="Remove file"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={reading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed bg-background/50 px-4 py-6 text-sm text-muted-foreground transition hover:border-emerald-500/50 hover:text-foreground"
        >
          <FileUp className="size-4" aria-hidden="true" />
          {reading ? "Reading file…" : "Choose a file (max 4MB)"}
        </button>
      )}
    </div>
  );
}

function isFileAnswer(value: AnswerValue): value is FileAnswer {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "data" in value;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
