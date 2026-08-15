import type { FieldType, FormVisibility } from "@repo/validators";

export interface BuilderField {
  clientId: string;
  id?: string;
  type: FieldType;
  label: string;
  placeholder?: string | null;
  required: boolean;
  options: string[];
  maxSelections?: number | null;
  order: number;
}

export interface BuilderForm {
  id?: string;
  title: string;
  description?: string | null;
  slug?: string;
  visibility: FormVisibility;
  isPublished?: boolean;
  responseCount?: number;
  notificationsEnabled?: boolean;
  notifyEmail?: string | null;
  thankYouMessage?: string | null;
  fields: BuilderField[];
}
