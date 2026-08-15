import { sendEmail } from "@repo/services/notifications";
import { generateToken, hashToken, userService } from "@repo/services/user";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const webUrl = () => process.env.WEB_URL ?? "http://localhost:3000";

/**
 * Issue a password reset token and email the reset link. Always resolves
 * successfully (even for unknown emails) so the endpoint cannot be used to
 * enumerate which accounts exist.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await userService.findByEmail(email);

  if (!user?.password) {
    // Still "succeed": either the account doesn't exist or it signs in with
    // Google only. Do not reveal which.
    return;
  }

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await userService.setPasswordResetToken(user.id, hash, expiresAt);

  const resetUrl = `${webUrl()}/reset-password?token=${raw}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your ChaiForm password",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 4px">Reset your password</p>
        <p style="font-size:14px;color:#52525b;margin:0 0 20px">Click the button below to choose a new password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px">Reset password</a>
        <p style="font-size:13px;color:#71717a;margin:20px 0 0">Or copy this link: ${resetUrl}</p>
      </div>
    `,
    text: [
      "Reset your ChaiForm password",
      "",
      "Click the link below to choose a new password. It expires in 1 hour.",
      resetUrl,
    ].join("\n"),
  });
}

/** Validate a reset token and set a new password for the account. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await userService.findByPasswordResetToken(hashToken(token));

  if (!user) {
    return { ok: false, message: "This reset link is invalid or has expired. Request a new one." };
  }

  await userService.resetPassword(user.id, newPassword);

  return { ok: true };
}
