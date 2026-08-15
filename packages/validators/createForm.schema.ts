import { z } from "zod";

import { createFieldSchema } from "./createField.schema";

export const formVisibilitySchema = z.enum(["private", "public"]);

export const slugSchema = z
  .string()
  .trim()
  .min(3, "Slug must be at least 3 characters.")
  .max(180, "Slug must be 180 characters or fewer.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

export const createFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  slug: slugSchema.optional(),
  visibility: formVisibilitySchema.default("private"),
  notificationsEnabled: z.boolean().default(false),
  notifyEmail: z.string().trim().email("Enter a valid email address.").max(255).optional().nullable(),
  thankYouMessage: z.string().trim().max(1000).optional().nullable(),
  fields: z.array(createFieldSchema).max(50, "A form can have at most 50 fields.").default([]),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type FormVisibility = z.infer<typeof formVisibilitySchema>;
