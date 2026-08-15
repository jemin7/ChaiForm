import { randomUUID } from "node:crypto";
import mongoose, { type Model } from "mongoose";

export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "number",
  "select",
  "checkbox",
  "rating",
  "date",
  "file",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  maxSelections: number | null;
  order: number;
}

/** Raw embedded field document shape. */
export interface FormFieldLean {
  _id: string;
  type: FieldType;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  maxSelections: number | null;
  order: number;
}

export type FormVisibility = "private" | "public";

export interface Form {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  visibility: FormVisibility;
  isPublished: boolean;
  notificationsEnabled: boolean;
  notifyEmail: string | null;
  thankYouMessage: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  fields?: FormField[];
}

/** Raw form document shape (as returned by lean queries / toObject). */
export interface FormLean {
  _id: string;
  title: string;
  description: string | null;
  slug: string;
  visibility: FormVisibility;
  isPublished: boolean;
  notificationsEnabled: boolean;
  notifyEmail: string | null;
  thankYouMessage: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  fields: FormFieldLean[];
}

const formFieldSchema = new mongoose.Schema<FormFieldLean>(
  {
    _id: { type: String, default: randomUUID },
    type: { type: String, enum: FIELD_TYPES, required: true },
    label: { type: String, required: true, maxlength: 180 },
    placeholder: { type: String, default: null },
    required: { type: Boolean, default: false },
    options: { type: [String], default: null },
    maxSelections: { type: Number, default: null, min: 1, max: 20 },
    order: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const formSchema = new mongoose.Schema<FormLean>(
  {
    _id: { type: String, default: randomUUID },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: null },
    slug: { type: String, required: true, maxlength: 180, unique: true },
    visibility: { type: String, enum: ["private", "public"], default: "private" },
    isPublished: { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean, default: false },
    notifyEmail: { type: String, default: null, maxlength: 255 },
    thankYouMessage: { type: String, default: null, maxlength: 1000 },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
    fields: { type: [formFieldSchema], default: [] },
  },
  { versionKey: false },
);

formSchema.index({ userId: 1 });
formSchema.index({ isPublished: 1, visibility: 1 });

export const FormModel =
  (mongoose.models.Form as Model<FormLean> | undefined) ??
  mongoose.model<FormLean>("Form", formSchema);

export function toFormField(doc: FormFieldLean): FormField {
  return {
    id: doc._id,
    type: doc.type,
    label: doc.label,
    placeholder: doc.placeholder,
    required: doc.required,
    options: doc.options,
    maxSelections: doc.maxSelections ?? null,
    order: doc.order,
  };
}

export function toForm(doc: FormLean): Form {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description,
    slug: doc.slug,
    visibility: doc.visibility,
    isPublished: doc.isPublished,
    notificationsEnabled: doc.notificationsEnabled,
    notifyEmail: doc.notifyEmail,
    thankYouMessage: doc.thankYouMessage ?? null,
    userId: doc.userId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(doc.fields?.length ? { fields: doc.fields.map(toFormField) } : {}),
  };
}
