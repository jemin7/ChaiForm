import { validateServerEnv } from "@repo/validators/env";

export const env = validateServerEnv(process.env);
