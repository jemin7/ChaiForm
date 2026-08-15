import { randomUUID } from "node:crypto";

import { FormModel, toForm } from "@repo/database";
import type { CreateFormInput } from "@repo/validators/create-form";

import { createUniqueSlug, normalizeFields } from "./helpers";

export async function createForm(userId: string, input: CreateFormInput) {
  const slug = await createUniqueSlug(input.title, input.slug);
  const normalizedFields = normalizeFields(input.fields);

  const form = await FormModel.create({
    title: input.title,
    description: input.description?.trim() || null,
    slug,
    visibility: input.visibility,
    isPublished: false,
    notificationsEnabled: input.notificationsEnabled,
    notifyEmail: input.notifyEmail?.trim() || null,
    thankYouMessage: input.thankYouMessage?.trim() || null,
    userId,
    fields: normalizedFields.map((field) => ({
      _id: field.id ?? randomUUID(),
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
      order: field.order,
    })),
  });

  return toForm(form.toObject());
}
