import { z } from "zod";

const passwordMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  email: z.email("Enter a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, passwordMessage)
    .max(128, "Password must be 128 characters or fewer.")
    .regex(/[a-z]/, passwordMessage)
    .regex(/[A-Z]/, passwordMessage)
    .regex(/[0-9]/, passwordMessage)
    .regex(/[^A-Za-z0-9]/, passwordMessage),
});

export type SignupInput = z.infer<typeof signupSchema>;
