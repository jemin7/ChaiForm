import { z } from "zod";

export const getPublicFormSchema = z.object({
  slug: z.string().trim().min(1).max(180),
});

export const fileAnswerSchema = z.object({
  name: z.string().trim().min(1, "File name is required.").max(255),
  type: z.string().trim().max(120),
  size: z.number().int().min(0).max(4_000_000, "Files must be 4MB or smaller."),
  data: z.string().min(1).max(6_000_000, "File data is too large."),
});

export type FileAnswer = z.infer<typeof fileAnswerSchema>;

export const answerValueSchema = z.union([
  z.string().max(5000, "Answer is too long."),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().trim().min(1).max(500)).max(50, "Too many selections."),
  fileAnswerSchema,
  z.null(),
]);

export const submitResponseSchema = z.object({
  slug: z.string().trim().min(1).max(180),
  // Honeypot spam trap: real respondents never see this field, so a
  // non-empty value means the submission came from a bot.
  honeypot: z.string().trim().max(500).optional(),
  answers: z
    .array(
      z.object({
        fieldId: z.uuid(),
        value: answerValueSchema,
      }),
    )
    .max(50, "A response can have at most 50 answers."),
});

export type GetPublicFormInput = z.infer<typeof getPublicFormSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type AnswerValue = z.infer<typeof answerValueSchema>;
