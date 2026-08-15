"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@repo/auth";
import { AuthServiceError, signup } from "@repo/services/auth";
import { clientIp, rateLimit } from "~/lib/rate-limit";
import { signupSchema } from "@repo/validators/signup";

export interface SignupActionState {
  error?: string;
}

export async function signupAction(
  _previousState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  // Cap account creation per IP to slow down signup spam.
  if (!rateLimit(`signup:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid signup details." };
  }

  try {
    await signup(parsed.data);
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthServiceError && error.code === "DUPLICATE_EMAIL") {
      return { error: error.message };
    }

    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed. Please log in." };
    }

    throw error;
  }

  redirect("/dashboard");
}
