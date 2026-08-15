import { FormModel, toForm, toFormField, type Form } from "@repo/database";
import type { CreateFieldInput } from "@repo/validators/create-field";

import { FormServiceError } from "./errors";

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "untitled-form";
}

export async function createUniqueSlug(title: string, requestedSlug?: string, excludeFormId?: string) {
  const baseSlug = slugify(requestedSlug ?? title);
  let candidate = baseSlug;
  let suffix = 1;

  while (await slugExists(candidate, excludeFormId)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

async function slugExists(slug: string, excludeFormId?: string) {
  const query: Record<string, unknown> = { slug };
  if (excludeFormId) {
    query._id = { $ne: excludeFormId };
  }
  return !!(await FormModel.exists(query));
}

export async function getFillableForm(slug: string, viewerId?: string | null): Promise<Form> {
  const form = await FormModel.findOne({ slug, isPublished: true }).lean();

  if (!form) {
    throw new FormServiceError("This form is not available.", "NOT_FOUND");
  }

  if (form.visibility === "private" && form.userId !== viewerId) {
    throw new FormServiceError("This form is not available.", "NOT_FOUND");
  }

  return toForm(form);
}

export async function getOwnedFormOrThrow(formId: string, userId: string): Promise<Form> {
  const form = await FormModel.findOne({ _id: formId, userId }).lean();

  if (!form) {
    throw new FormServiceError("Form not found.", "NOT_FOUND");
  }

  return toForm(form);
}

export async function getFieldsForForm(formId: string) {
  const form = await FormModel.findById(formId, { fields: 1 }).lean();
  return (form?.fields ?? []).map(toFormField);
}

export function normalizeFields(fields: CreateFieldInput[]) {
  const normalized = fields.map((field, index) => ({
    ...field,
    placeholder: field.placeholder?.trim() || null,
    options:
      field.type === "select" || field.type === "checkbox"
        ? [...new Set(field.options?.map((option) => option.trim()).filter(Boolean) ?? [])]
        : null,
    maxSelections:
      field.type === "select" || field.type === "checkbox" ? (field.maxSelections ?? null) : null,
    order: index,
  }));

  return normalized;
}
