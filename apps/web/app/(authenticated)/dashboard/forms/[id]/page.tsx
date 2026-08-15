import { EditFormLoader } from "~/components/forms/edit-form-loader";

interface EditFormPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const { id } = await params;

  return <EditFormLoader formId={id} />;
}
