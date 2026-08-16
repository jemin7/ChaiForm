import type { Metadata } from "next";

import { getPublicFormBySlug } from "@repo/services/forms";

import { PublicFormView } from "~/components/forms/public-form-view";

interface FillFormPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: FillFormPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Private forms are intentionally not found for anonymous visitors, so the
  // metadata falls back to the generic title without leaking anything.
  try {
    const form = await getPublicFormBySlug(slug);

    return {
      title: form.title || "ChaiForm",
      description: form.description || `Fill out ${form.title || "this form"} on ChaiForm.`,
    };
  } catch {
    return { title: "ChaiForm" };
  }
}

export default async function FillFormPage({ params }: FillFormPageProps) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 sm:py-16">
      <PublicFormView slug={slug} />
    </main>
  );
}
