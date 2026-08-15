export interface ResponseNotificationInput {
  to: string;
  formTitle: string;
  formUrl: string;
  answers: Array<{
    label: string;
    value: string;
  }>;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let warnedAboutDefaultFrom = false;

function formatValue(value: string): string {
  const MAX_LENGTH = 400;

  if (value.length <= MAX_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_LENGTH)}…`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DEFAULT_FROM = "ChaiForm <onboarding@resend.dev>";

/**
 * Send an email through Resend. No-ops (with a warning) when RESEND_API_KEY is
 * not configured so email features degrade gracefully in development.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return;
  }

  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;

  // Resend's shared `onboarding@resend.dev` sender only delivers to the
  // account owner's own inbox — real users will never receive these emails.
  // Warn once so it doesn't silently fail in production.
  if (from.includes(DEFAULT_FROM) && !warnedAboutDefaultFrom) {
    warnedAboutDefaultFrom = true;
    console.warn(
      "[notifications] EMAIL_FROM is still set to the Resend default. Verify a domain and set EMAIL_FROM so emails reach real recipients.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[notifications] Resend request failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}

export async function sendResponseNotification(input: ResponseNotificationInput): Promise<void> {
  const rows = input.answers.length
    ? input.answers
        .map(
          (answer) =>
            `<tr><td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;white-space:nowrap;color:#18181b">${escapeHtml(answer.label)}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#3f3f46">${escapeHtml(formatValue(answer.value))}</td></tr>`,
        )
        .join("")
    : '<tr><td style="padding:10px 14px;color:#3f3f46">This submission contained no answers.</td></tr>';

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 4px">New response to “${escapeHtml(input.formTitle)}”</p>
      <p style="font-size:13px;color:#71717a;margin:0 0 20px">Someone just submitted your form.</p>
      <table style="width:100%;border:1px solid #e4e4e7;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:14px">
        ${rows}
      </table>
      <p style="margin:20px 0 0">
        <a href="${escapeHtml(input.formUrl)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px">View responses</a>
      </p>
    </div>
  `;

  const text = [
    `New response to "${input.formTitle}"`,
    "",
    ...input.answers.map((answer) => `${answer.label}: ${formatValue(answer.value)}`),
    "",
    `View responses: ${input.formUrl}`,
  ].join("\n");

  await sendEmail({
    to: input.to,
    subject: `New response: ${input.formTitle}`,
    html,
    text,
  });
}
