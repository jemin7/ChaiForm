import { hash } from "bcryptjs";

import type { User } from "@repo/database";
import { signupSchema, type SignupInput } from "@repo/validators/signup";

import { userService } from "../user";
import { sendEmailVerification } from "./emailVerification.service";
import { AuthServiceError } from "./errors";

const PASSWORD_HASH_ROUNDS = 12;

export async function signup(input: SignupInput) {
  const parsed = signupSchema.parse(input);
  const existingUser = await userService.findByEmail(parsed.email);

  if (existingUser) {
    throw new AuthServiceError("An account with this email already exists.", "DUPLICATE_EMAIL");
  }

  const hashedPassword = await hash(parsed.password, PASSWORD_HASH_ROUNDS);

  let createdUser: User;

  try {
    createdUser = await userService.createCredentialsUser({
      name: parsed.name,
      email: parsed.email,
      password: hashedPassword,
    });
  } catch (error) {
    // The pre-check above is a fast path; a concurrent signup can still trip
    // the unique index on email (MongoDB duplicate key error code 11000).
    if (isUniqueViolation(error)) {
      throw new AuthServiceError("An account with this email already exists.", "DUPLICATE_EMAIL");
    }

    throw error;
  }

  // Email delivery is best-effort: a failed verification email must never
  // block the account from being created.
  void sendEmailVerification(createdUser).catch((error) => {
    console.error("[auth] Unable to send verification email:", error);
  });

  return createdUser;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}
