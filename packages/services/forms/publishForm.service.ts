import { FormModel, toForm } from "@repo/database";

import { getFieldsForForm, getOwnedFormOrThrow } from "./helpers";
import { FormServiceError } from "./errors";

export async function publishForm(userId: string, formId: string) {
  await getOwnedFormOrThrow(formId, userId);
  const fields = await getFieldsForForm(formId);

  if (!fields.length) {
    throw new FormServiceError("Add at least one field before publishing.", "INVALID_FIELDS");
  }

  const form = await FormModel.findOneAndUpdate(
    { _id: formId, userId },
    { $set: { isPublished: true, updatedAt: new Date() } },
    { new: true },
  ).lean();

  if (!form) {
    throw new FormServiceError("Form not found.", "NOT_FOUND");
  }

  return toForm(form);
}

export async function unpublishForm(userId: string, formId: string) {
  await getOwnedFormOrThrow(formId, userId);

  const form = await FormModel.findOneAndUpdate(
    { _id: formId, userId },
    { $set: { isPublished: false, updatedAt: new Date() } },
    { new: true },
  ).lean();

  if (!form) {
    throw new FormServiceError("Form not found.", "NOT_FOUND");
  }

  return toForm(form);
}
