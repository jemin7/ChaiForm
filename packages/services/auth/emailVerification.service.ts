import { sendEmail } from "@repo/services/notifications";
import { generateToken, hashToken, userService } from "@repo/services/user";

import type { User } from "@repo/database";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Build the base URL for links embedded in emails. WEB_URL is the intended
// source of truth; if it isn't set (e.g. the web app's Vercel env only
// configures NEXTAUTH_URL/AUTH_URL), fall back to those so verification links
// never point at localhost in production.
const webUrl = () =>
  process.env.WEB_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.AUTH_URL ??
  "http://localhost:3000";

/** Issue a verification token for a new credentials account and email it. */
export async function sendEmailVerification(user: User): Promise<void> {
  if (user.emailVerified) {
    return;
  }

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await userService.setEmailVerificationToken(user.id, hash, expiresAt);

  const verifyUrl = `${webUrl()}/verify-email?token=${raw}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your ChaiForm email",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 4px">Verify your email address</p>
        <p style="font-size:14px;color:#52525b;margin:0 0 20px">Click the button below to confirm you own this email and keep your account secure. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px">Verify email</a>
        <p style="font-size:13px;color:#71717a;margin:20px 0 0">Or copy this link: ${verifyUrl}</p>
      </div>
    `,
    text: [
      "Verify your email address",
      "",
      "Click the link below to confirm you own this email. It expires in 24 hours.",
      verifyUrl,
    ].join("\n"),
  });
}

/** Validate a verification token and mark the account verified. */
export async function verifyEmail(token: string): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const user = await userService.verifyEmailWithToken(hashToken(token));

  if (!user) {
    return { ok: false, message: "This verification link is invalid or has expired." };
  }

  return { ok: true, email: user.email };
}
