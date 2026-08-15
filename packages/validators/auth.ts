import { z } from "zod";

export const authUserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  image: z.url().nullable(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
