import { FormsList } from "~/components/forms/forms-list";

interface DashboardFormsPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function DashboardFormsPage({ searchParams }: DashboardFormsPageProps) {
  const params = await searchParams;

  return <FormsList initialQuery={params.q} />;
}
