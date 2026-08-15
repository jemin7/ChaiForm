import { z } from "zod";

export const generateFormSchema = z.object({
  prompt: z.string().trim().min(3, "Describe the form you want to build.").max(1000),
});

export const summarizeResponsesSchema = z.object({
  id: z.uuid(),
});

export type GenerateFormInput = z.infer<typeof generateFormSchema>;
export type SummarizeResponsesInput = z.infer<typeof summarizeResponsesSchema>;
