import { z } from "zod";

import { createFieldSchema } from "./createField.schema";
import { formVisibilitySchema, slugSchema } from "./createForm.schema";

export const updateFormSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  slug: slugSchema.optional(),
  visibility: formVisibilitySchema,
  notificationsEnabled: z.boolean(),
  notifyEmail: z.string().trim().email("Enter a valid email address.").max(255).optional().nullable(),
  thankYouMessage: z.string().trim().max(1000).optional().nullable(),
  fields: z.array(createFieldSchema).max(50, "A form can have at most 50 fields."),
});

export const deleteFormSchema = z.object({
  id: z.uuid(),
});

export const getFormByIdSchema = z.object({
  id: z.uuid(),
});

export const getResponsesSchema = getFormByIdSchema.extend({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export type UpdateFormInput = z.infer<typeof updateFormSchema>;
