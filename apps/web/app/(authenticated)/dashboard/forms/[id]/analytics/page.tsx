import { FormAnalytics } from "~/components/forms/form-analytics";

interface FormAnalyticsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FormAnalyticsPage({ params }: FormAnalyticsPageProps) {
  const { id } = await params;

  return <FormAnalytics formId={id} />;
}
