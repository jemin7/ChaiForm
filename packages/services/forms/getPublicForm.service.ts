import { UserModel } from "@repo/database";

import { getFillableForm } from "./helpers";

export async function getPublicFormBySlug(slug: string, viewerId?: string | null) {
  const form = await getFillableForm(slug, viewerId);

  // Pro plans remove the "Powered by ChaiForm" footer from published forms.
  const owner = await UserModel.findOne({ _id: form.userId }, { plan: 1 }).lean();
  const showBranding = owner?.plan !== "pro";

  return {
    ...form,
    fields: form.fields ?? [],
    showBranding,
  };
}
