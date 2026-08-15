import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1).describe("MongoDB connection string"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
