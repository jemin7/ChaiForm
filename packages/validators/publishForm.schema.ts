import { z } from "zod";

export const publishFormSchema = z.object({
  id: z.uuid(),
});

export type PublishFormInput = z.infer<typeof publishFormSchema>;
