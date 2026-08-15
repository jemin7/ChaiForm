"use server";

import { requestPasswordReset } from "@repo/services/auth";
import { clientIp, rateLimit } from "~/lib/rate-limit";

export interface RequestPasswordResetState {
  success?: boolean;
  error?: string;
}

export async function requestPasswordResetAction(
  _previousState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  if (!rateLimit(`forgot-password:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many requests. Please try again later." };
  }

  const email = formData.get("email")?.toString().trim() ?? "";

  if (!email) {
    return { error: "Enter your email address." };
  }

  // The service never reveals whether an account exists for this email, so
  // this endpoint cannot be used to enumerate users.
  await requestPasswordReset(email);

  return { success: true };
}
