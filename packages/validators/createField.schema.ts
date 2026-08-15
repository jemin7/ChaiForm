import { z } from "zod";

export const fieldTypeSchema = z.enum([
  "text",
  "textarea",
  "email",
  "number",
  "select",
  "checkbox",
  "rating",
  "date",
  "file",
]);

export const fieldOptionSchema = z
  .string()
  .trim()
  .min(1, "Options cannot be empty.")
  .max(80, "Options must be 80 characters or fewer.");

export const createFieldSchema = z
  .object({
    id: z.uuid().optional(),
    type: fieldTypeSchema,
    label: z.string().trim().min(1, "Field label is required.").max(180),
    placeholder: z.string().trim().max(240).optional().nullable(),
    required: z.boolean().default(false),
    options: z.array(fieldOptionSchema).max(20, "A field can have at most 20 options.").optional(),
    maxSelections: z.number().int().min(1).max(20).optional().nullable(),
    order: z.number().int().min(0).max(200),
  })
  .superRefine((field, ctx) => {
    if ((field.type === "select" || field.type === "checkbox") && (!field.options?.length)) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Select and checkbox fields require at least one option.",
      });
    }

    if (field.maxSelections != null && field.type !== "select" && field.type !== "checkbox") {
      ctx.addIssue({
        code: "custom",
        path: ["maxSelections"],
        message: "Max selections only applies to select and checkbox fields.",
      });
    }
  });

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
