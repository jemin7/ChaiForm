import { z } from "zod";

export const serverEnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.url().optional(),
  NEXTAUTH_URL: z.url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  const parsed = serverEnvSchema.safeParse(env);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
}
