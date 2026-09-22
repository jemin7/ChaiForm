import type { FieldType } from "@repo/validators/create-field";

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

const ALLOWED_FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "email",
  "number",
  "select",
  "checkbox",
  "rating",
  "date",
  "file",
];

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONFIGURED" | "UPSTREAM" | "INVALID_RESPONSE" = "UPSTREAM",
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
// Gemini's free tier regularly returns 503 "high demand" bursts that outlast a
// couple of fast retries, so give the provider more time to recover before
// surfacing an error to the user.
const MAX_ATTEMPTS = 4;
const MAX_RETRY_BACKOFF_MS = 8_000;

function isTransientError(error: unknown): error is AiServiceError {
  return (
    error instanceof AiServiceError &&
    error.code === "UPSTREAM" &&
    error.status !== undefined &&
    RETRYABLE_STATUS.has(error.status)
  );
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get("retry-after");

  if (!header) {
    return null;
  }

  const seconds = Number(header);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  // Cap at 30s; enforce a minimum of 5s so we don't hammer a rate-limited
  // provider that returns a very short Retry-After.
  return Math.max(5, Math.min(seconds, 30)) * 1000;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function apiKey(): string {
  const key = process.env.AI_API_KEY;

  if (!key) {
    throw new AiServiceError(
      "AI is not configured yet. Ask your admin to set the AI_API_KEY environment variable.",
      "NOT_CONFIGURED",
    );
  }

  return key;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chat(messages: ChatMessage[], expectJson = true): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await chatOnce(messages, expectJson);
    } catch (error) {
      lastError = error;

      if (attempt === MAX_ATTEMPTS || !isTransientError(error)) {
        throw error;
      }

      // Base backoff of 1.5s, doubling per attempt and capped, with jitter. A
      // 429 without a Retry-After header needs generous cooldown to avoid
      // hammering the provider while it's already rate-limiting us.
      const backoff = Math.min(1500 * 2 ** (attempt - 1), MAX_RETRY_BACKOFF_MS);
      await sleep(error.retryAfterMs ?? backoff + Math.random() * 500);
    }
  }

  throw lastError;
}

async function chatOnce(messages: ChatMessage[], expectJson = true): Promise<string> {
  const key = apiKey();
  let response: Response;

  try {
    response = await fetch(`${AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 2200,
        ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    // Timeouts (AbortSignal), connection resets and DNS failures all land
    // here as opaque TypeErrors. Mark them retryable so a transient network
    // hiccup doesn't fail the request outright.
    throw new AiServiceError(
      `AI request failed: ${error instanceof Error ? error.message : "network error"}`,
      "UPSTREAM",
      502,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = RETRYABLE_STATUS.has(response.status)
      ? "The AI service is busy right now. Please try again in a minute."
      : `AI request failed (${response.status}). ${detail.slice(0, 200)}`;
    throw new AiServiceError(message, "UPSTREAM", response.status, parseRetryAfter(response) ?? undefined);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    // Some Gemini models occasionally answer with 0 tokens (reasoning consumed
    // the budget). Give it status 502 so the retry loop treats it as transient.
    throw new AiServiceError("AI returned an empty response.", "UPSTREAM", 502);
  }

  return content;
}

function parseJson<T>(content: string): T {
  const tryParse = (text: string): T | null => {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  const direct = tryParse(content);

  if (direct !== null) {
    return direct;
  }

  // Models sometimes wrap the JSON in prose or markdown fences; recover the
  // outermost object before giving up.
  const match = content.match(/\{[\s\S]*\}/);

  if (match) {
    const extracted = tryParse(match[0]);

    if (extracted !== null) {
      return extracted;
    }
  }

  // Retryable status so one malformed response gets another attempt instead
  // of failing the whole request.
  throw new AiServiceError("AI returned an unreadable response.", "INVALID_RESPONSE", 502);
}

export interface AiGeneratedField {
  type: FieldType;
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[];
}

export interface AiFormDraft {
  title: string;
  description: string;
  fields: AiGeneratedField[];
}

interface RawDraft {
  title?: unknown;
  description?: unknown;
  fields?: unknown;
}

interface RawField {
  type?: unknown;
  label?: unknown;
  placeholder?: unknown;
  required?: unknown;
  options?: unknown;
}

function sanitizeDraft(raw: RawDraft): AiFormDraft {
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim().slice(0, 160)
      : "Untitled form";
  const description =
    typeof raw.description === "string" ? raw.description.trim().slice(0, 2000) : "";

  const fields = Array.isArray(raw.fields) ? raw.fields.slice(0, 12) : [];

  const sanitized = fields.flatMap((entry): AiGeneratedField[] => {
    const field = entry as RawField;

    if (typeof field.label !== "string" || !field.label.trim()) {
      return [];
    }

    const type = ALLOWED_FIELD_TYPES.includes(field.type as FieldType)
      ? (field.type as FieldType)
      : "text";

    const options = Array.isArray(field.options)
      ? field.options
          .filter((option): option is string => typeof option === "string" && Boolean(option.trim()))
          .map((option) => option.trim().slice(0, 80))
          .slice(0, 20)
      : [];

    return [
      {
        type,
        label: field.label.trim().slice(0, 180),
        placeholder:
          typeof field.placeholder === "string" && field.placeholder.trim()
            ? field.placeholder.trim().slice(0, 240)
            : null,
        required: field.required === true,
        options: type === "select" || type === "checkbox" ? (options.length ? options : ["Option 1"]) : undefined,
      },
    ];
  });

  return { title, description, fields: sanitized };
}

export async function generateFormDraft(prompt: string): Promise<AiFormDraft> {
  const content = await chat([
    {
      role: "system",
      content: [
        "You are an expert form and survey designer for a product called ChaiForm.",
        "Create a short, focused form that gets high completion rates: 5 to 10 questions, clear simple labels, no duplicate questions.",
        "Use the right field type for each question: text (short answer), textarea (open ended), email, number, select (single choice), checkbox (multiple choice), rating (1-5), date, file (when a document or image upload makes sense).",
        "Every select and checkbox field MUST include 3 to 6 concise options.",
        "Return ONLY a JSON object with this exact shape:",
        '{"title": string, "description": string, "fields": [{"type": "text|textarea|email|number|select|checkbox|rating|date|file", "label": string, "placeholder"?: string, "required": boolean, "options"?: string[]}]}',
        "Do not wrap the JSON in markdown fences or add any other text.",
      ].join(" "),
    },
    { role: "user", content: `Build a form for: ${prompt}` },
  ]);

  return sanitizeDraft(parseJson<RawDraft>(content));
}

export interface AiSummaryFieldAnswer {
  name: string;
  type: string;
  size: number;
  data: string;
}

export interface AiSummaryInput {
  formTitle: string;
  totalResponses: number;
  fields: Array<{
    label: string;
    type: string;
    answerCount: number;
    answers: Array<string | number | boolean | string[] | AiSummaryFieldAnswer | null>;
  }>;
}

export async function summarizeResponses(input: AiSummaryInput): Promise<string> {
  const fieldSummary = input.fields
    .filter((field) => field.answerCount > 0)
    .map((field) => {
      const sample = field.answers
        .filter((value) => value !== null && value !== "")
        .slice(0, 60)
        .map((value) => {
          if (Array.isArray(value)) {
            return value.join(", ");
          }

          if (typeof value === "object" && value !== null) {
            return `📎 ${value.name}`;
          }

          return String(value);
        })
        .join(" | ");

      return `- "${field.label}" (${field.type}, answered by ${field.answerCount} of ${input.totalResponses}): ${sample || "(no answers)"}`;
    })
    .join("\n");

  const content = await chat(
    [
      {
        role: "system",
        content: [
          "You are a data analyst summarizing form responses for the form owner.",
          "Write a concise, plain-language summary (120-200 words) with: 1) the headline takeaway, 2) 2-4 bullet insights with specific numbers where possible, 3) one suggested next action.",
          "Be honest when data is thin. Do not invent statistics.",
          "Use plain markdown: a short intro paragraph, bullet points, and a final 'Suggested next step:' line.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Form: ${input.formTitle}\nTotal responses: ${input.totalResponses}\n\nQuestion breakdown:\n${fieldSummary}`,
      },
    ],
    false,
  );

  return content.trim();
}

export { ALLOWED_FIELD_TYPES };
