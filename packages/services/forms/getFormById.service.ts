import { ResponseModel } from "@repo/database";

import { getOwnedFormOrThrow } from "./helpers";

export async function getFormById(userId: string, formId: string) {
  const form = await getOwnedFormOrThrow(formId, userId);

  const responseCount = await ResponseModel.countDocuments({ formId: form.id });

  return {
    ...form,
    responseCount,
    fields: form.fields ?? [],
  };
}
