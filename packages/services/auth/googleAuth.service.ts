import { userService } from "../user";

export interface GoogleProfileInput {
  name: string;
  email: string;
  image: string | null;
}

export async function persistGoogleUser(input: GoogleProfileInput) {
  return userService.upsertGoogleUser(input);
}
