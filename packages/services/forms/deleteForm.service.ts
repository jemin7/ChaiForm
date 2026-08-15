import { FormModel, ResponseModel } from "@repo/database";

import { getOwnedFormOrThrow } from "./helpers";

export async function deleteForm(userId: string, formId: string) {
  await getOwnedFormOrThrow(formId, userId);

  // SQL schema cascaded deletes to responses; replicate that explicitly.
  await ResponseModel.deleteMany({ formId });
  await FormModel.deleteOne({ _id: formId, userId });

  return { id: formId };
}
