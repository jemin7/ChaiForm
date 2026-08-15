import { ResponsesView } from "~/components/forms/responses-view";

interface FormResponsesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FormResponsesPage({ params }: FormResponsesPageProps) {
  const { id } = await params;

  return <ResponsesView formId={id} />;
}
