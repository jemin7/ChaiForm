import { ResponseModel, toResponse, UserModel, type Form, type FormField } from "@repo/database";
import { isAnswerEmpty } from "@repo/validators/condition";
import type { AnswerValue, SubmitResponseInput } from "@repo/validators/submit-response";
import { sendResponseNotification } from "@repo/services/notifications";

import { FormServiceError } from "./errors";
import { getFillableForm } from "./helpers";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeAnswer(field: FormField, value: AnswerValue): AnswerValue {
  // Optional fields may be submitted without an answer. Required fields are
  // enforced separately above, so a null here always means "left empty".
  if (value === null) {
    return null;
  }

  switch (field.type) {
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new FormServiceError(`"${field.label}" expects a number.`, "INVALID_FIELDS");
      }

      return value;
    }
    case "checkbox": {
      if (value === null) {
        return null;
      }

      if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new FormServiceError(`"${field.label}" expects one or more selections.`, "INVALID_FIELDS");
      }

      const checkboxOptions = field.options;

      if (checkboxOptions?.length && value.some((entry) => !checkboxOptions.includes(entry))) {
        throw new FormServiceError(`"${field.label}" contains an invalid selection.`, "INVALID_FIELDS");
      }

      if (field.maxSelections && value.length > field.maxSelections) {
        throw new FormServiceError(
          `"${field.label}" allows at most ${field.maxSelections} selections.`,
          "INVALID_FIELDS",
        );
      }

      return value;
    }
    case "select": {
      if (value === null) {
        return null;
      }

      // A select field with a max of 2+ is multi-select and receives an array.
      if (field.maxSelections && field.maxSelections > 1) {
        if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
          throw new FormServiceError(`"${field.label}" expects one or more selections.`, "INVALID_FIELDS");
        }

        const selectOptions = field.options;

        if (selectOptions?.length && value.some((entry) => !selectOptions.includes(entry))) {
          throw new FormServiceError(`"${field.label}" contains an invalid selection.`, "INVALID_FIELDS");
        }

        if (value.length > field.maxSelections) {
          throw new FormServiceError(
            `"${field.label}" allows at most ${field.maxSelections} selections.`,
            "INVALID_FIELDS",
          );
        }

        return value;
      }

      if (typeof value !== "string") {
        throw new FormServiceError(`"${field.label}" expects a single selection.`, "INVALID_FIELDS");
      }

      const selectOptions = field.options;

      if (selectOptions?.length && !selectOptions.includes(value)) {
        throw new FormServiceError(`"${field.label}" contains an invalid selection.`, "INVALID_FIELDS");
      }

      return value;
    }
    case "rating": {
      if (value === null) {
        return null;
      }

      if (typeof value !== "number" || value < 1 || value > 5 || !Number.isInteger(value)) {
        throw new FormServiceError(`"${field.label}" expects a rating between 1 and 5.`, "INVALID_FIELDS");
      }

      return value;
    }
    case "date": {
      if (value === null) {
        return null;
      }

      if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
        throw new FormServiceError(`"${field.label}" expects a valid date.`, "INVALID_FIELDS");
      }

      return value;
    }
    case "file": {
      if (value === null) {
        return null;
      }

      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new FormServiceError(`"${field.label}" expects a file.`, "INVALID_FIELDS");
      }

      const file = value as { name?: unknown; type?: unknown; size?: unknown; data?: unknown };

      if (
        typeof file.name !== "string" ||
        typeof file.type !== "string" ||
        typeof file.size !== "number" ||
        typeof file.data !== "string"
      ) {
        throw new FormServiceError(`"${field.label}" contains an invalid file.`, "INVALID_FIELDS");
      }

      if (file.size > 4_000_000) {
        throw new FormServiceError(`"${field.label}" files must be 4MB or smaller.`, "INVALID_FIELDS");
      }

      return { name: file.name.slice(0, 255), type: file.type.slice(0, 120), size: file.size, data: file.data };
    }
    case "email": {
      if (typeof value !== "string") {
        throw new FormServiceError(`"${field.label}" expects an email address.`, "INVALID_FIELDS");
      }

      const trimmed = value.trim();

      if (trimmed && !EMAIL_PATTERN.test(trimmed)) {
        throw new FormServiceError(`"${field.label}" expects a valid email address.`, "INVALID_FIELDS");
      }

      return trimmed || null;
    }
    case "text":
    case "textarea":
    default: {
      if (typeof value !== "string") {
        throw new FormServiceError(`"${field.label}" expects text.`, "INVALID_FIELDS");
      }

      const trimmed = value.trim();

      return trimmed || null;
    }
  }
}

export async function submitResponse(input: SubmitResponseInput, viewerId?: string | null) {
  const form = await getFillableForm(input.slug, viewerId);
  const fields = form.fields ?? [];
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  const answersByField: Record<string, AnswerValue> = {};

  for (const answer of input.answers) {
    answersByField[answer.fieldId] = answer.value;
  }

  for (const field of fields) {
    if (!field.required) {
      continue;
    }

    if (isAnswerEmpty(answersByField[field.id] ?? null)) {
      throw new FormServiceError(`"${field.label}" is required.`, "INVALID_FIELDS");
    }
  }

  const answers = input.answers.map((answer) => {
    const field = fieldsById.get(answer.fieldId);

    if (!field) {
      throw new FormServiceError("Answer references a field that does not exist on this form.", "INVALID_FIELDS");
    }

    const value = normalizeAnswer(field, answer.value);

    return { fieldId: field.id, value };
  });

  const response = await ResponseModel.create({
    formId: form.id,
    answers,
  });

  void notifyOwnerOfResponse(form, fields, answers);

  return toResponse(response.toObject());
}

async function notifyOwnerOfResponse(
  form: Form,
  fields: FormField[],
  answers: Array<{ fieldId: string; value: AnswerValue }>,
): Promise<void> {
  if (!form.notificationsEnabled) {
    return;
  }

  try {
    const owner = await UserModel.findOne({ _id: form.userId }, { email: 1 }).lean();

    if (!owner?.email) {
      return;
    }

    const labelsById = new Map(fields.map((field) => [field.id, field.label]));

    const summary = answers.map((answer) => {
      const label = labelsById.get(answer.fieldId) ?? "Untitled field";
      const value = describeAnswerValue(answer.value);

      return { label, value };
    });

    await sendResponseNotification({
      to: form.notifyEmail?.trim() || owner.email,
      formTitle: form.title,
      formUrl: `${process.env.WEB_URL ?? "http://localhost:3000"}/f/${form.slug}`,
      answers: summary,
    });
  } catch (error) {
    console.error("[notifications] Unable to notify form owner:", error);
  }
}

function describeAnswerValue(value: AnswerValue): string {
  if (value === null || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    const file = value as { name?: string; size?: number };
    return `📎 ${file.name ?? "Attached file"}${typeof file.size === "number" ? ` (${formatFileSize(file.size)})` : ""}`;
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
