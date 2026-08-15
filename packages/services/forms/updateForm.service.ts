import { randomUUID } from "node:crypto";

import { FormModel, toForm } from "@repo/database";
import type { UpdateFormInput } from "@repo/validators/update-form";

import { createUniqueSlug, getOwnedFormOrThrow, normalizeFields } from "./helpers";

export async function updateForm(userId: string, input: UpdateFormInput) {
  const existingForm = await getOwnedFormOrThrow(input.id, userId);
  // Keep the existing slug unless the owner explicitly provides one, so
  // editing a published form never silently breaks its share link. A taken
  // requested slug is deduped the same way it is on create.
  const slug = input.slug
    ? await createUniqueSlug(input.title, input.slug, existingForm.id)
    : existingForm.slug;

  const normalizedFields = normalizeFields(input.fields);

  const updatedForm = await FormModel.findOneAndUpdate(
    { _id: existingForm.id, userId },
    {
      $set: {
        title: input.title,
        description: input.description?.trim() || null,
        slug,
        visibility: input.visibility,
        notificationsEnabled: input.notificationsEnabled,
        notifyEmail: input.notifyEmail?.trim() || null,
        thankYouMessage: input.thankYouMessage?.trim() || null,
        updatedAt: new Date(),
        // Fields are embedded in the form document, so the submitted list
        // replaces the previous one atomically (existing field ids are kept).
        fields: normalizedFields.map((field) => ({
          _id: field.id ?? randomUUID(),
          type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          order: field.order,
        })),
      },
    },
    { new: true },
  ).lean();

  if (!updatedForm) {
    return existingForm;
  }

  return toForm(updatedForm);
}
