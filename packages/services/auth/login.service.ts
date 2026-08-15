import { compare } from "bcryptjs";

import { loginSchema, type LoginInput } from "@repo/validators/login";

import { userService } from "../user";
import { AuthServiceError } from "./errors";

export async function verifyCredentials(input: LoginInput) {
  const parsed = loginSchema.parse(input);
  const user = await userService.findByEmail(parsed.email);

  if (!user?.password) {
    throw new AuthServiceError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const isValidPassword = await compare(parsed.password, user.password);

  if (!isValidPassword) {
    throw new AuthServiceError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  return user;
}
