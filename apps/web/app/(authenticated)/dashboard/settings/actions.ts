"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth, signOut } from "@repo/auth";
import { userService } from "@repo/services/user";

const passwordMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.";

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(120);

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, passwordMessage)
      .max(128, "Password must be 128 characters or fewer.")
      .regex(/[a-z]/, passwordMessage)
      .regex(/[A-Z]/, passwordMessage)
      .regex(/[0-9]/, passwordMessage)
      .regex(/[^A-Za-z0-9]/, passwordMessage),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

export interface SettingsActionState {
  error?: string;
  success?: string;
}

export async function updateProfileAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const parsed = nameSchema.safeParse(formData.get("name"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  try {
    await userService.updateProfile(session.user.id, { name: parsed.data });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update profile." };
  }

  revalidatePath("/dashboard/settings");

  return { success: "Profile updated." };
}

export async function changePasswordAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  try {
    await userService.changePassword(
      session.user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to change password." };
  }

  // Changing the password bumps the account's session version, which revokes
  // every previously issued JWT — including this one. Sign out so the user
  // re-authenticates with the new password (signOut redirects via NEXT_REDIRECT).
  await signOut({ redirectTo: "/login?passwordUpdated=1" });

  return { success: "Password updated." };
}
