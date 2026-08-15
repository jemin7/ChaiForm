"use server";

import { AuthError } from "next-auth";

import { signIn } from "@repo/auth";
import { sanitizeCallbackUrl } from "~/lib/callback-url";
import { clientIp, rateLimit } from "~/lib/rate-limit";
import { loginSchema } from "@repo/validators/login";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  // Brute-force protection: cap attempts per IP before doing any work.
  if (!rateLimit(`login:${await clientIp()}`, 10, 60_000)) {
    return { error: "Too many sign-in attempts. Please try again in a minute." };
  }

  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl")?.toString());
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  // On success, signIn redirects (by throwing NEXT_REDIRECT, which the catch
  // below rethrows); on failure it throws an AuthError. Either way, execution
  // never reaches the fallback return below.
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }

    throw error;
  }

  return { error: "Unable to sign in." };
}
