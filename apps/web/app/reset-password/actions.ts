"use server";

import { z } from "zod";

import { resetPassword } from "@repo/services/auth";
import { clientIp, rateLimit } from "~/lib/rate-limit";

const passwordMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "This reset link is invalid."),
  newPassword: z
    .string()
    .min(8, passwordMessage)
    .max(128, "Password must be 128 characters or fewer.")
    .regex(/[a-z]/, passwordMessage)
    .regex(/[A-Z]/, passwordMessage)
    .regex(/[0-9]/, passwordMessage)
    .regex(/[^A-Za-z0-9]/, passwordMessage),
});

export interface ResetPasswordState {
  success?: boolean;
  error?: string;
}

export async function resetPasswordAction(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  if (!rateLimit(`reset-password:${await clientIp()}`, 10, 60 * 60 * 1000)) {
    return { error: "Too many attempts. Please try again later." };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reset details." };
  }

  const result = await resetPassword(parsed.data.token, parsed.data.newPassword);

  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true };
}
