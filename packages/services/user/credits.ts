import { AI_CREDITS_PER_DAY, AiUsageLogModel, UserModel } from "@repo/database";

export { AI_CREDITS_PER_DAY };

/** Per-operation credit costs. Tune these to change how much each request costs. */
export const FORM_GENERATION_CREDITS = 1;
export const RESPONSE_SUMMARY_CREDITS = 1;

export class InsufficientCreditsError extends Error {
  public constructor() {
    super("You've used all your AI credits for today. They reset daily.");
    this.name = "InsufficientCreditsError";
  }
}

/** UTC day bucket (YYYY-MM-DD). Credits reset at UTC midnight. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO timestamp of the next reset (start of tomorrow, UTC). */
function nextResetAt(today: string): string {
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + 1)).toISOString();
}

export interface AiCreditBalance {
  remaining: number;
  allowance: number;
  /** ISO timestamp of the next daily reset. */
  resetsAt: string;
}

/**
 * Return the user's current credit balance for today, lazily resetting it if
 * the stored day is stale (or the account predates credits). The reset is an
 * atomic conditional update, so concurrent reads can't double-reset.
 */
export async function getAiCreditBalance(userId: string): Promise<AiCreditBalance> {
  const today = dayKey(new Date());

  const refreshed = await UserModel.findOneAndUpdate(
    { _id: userId, aiCreditsDay: { $ne: today } },
    { $set: { aiCredits: AI_CREDITS_PER_DAY, aiCreditsDay: today } },
    { new: true },
  ).lean();

  const user = refreshed ?? (await UserModel.findById(userId).lean());

  return {
    remaining: user?.aiCredits ?? AI_CREDITS_PER_DAY,
    allowance: AI_CREDITS_PER_DAY,
    resetsAt: nextResetAt(today),
  };
}

/**
 * Atomically deduct `cost` credits for today, resetting the daily allowance
 * first if the stored day is stale. A single findOneAndUpdate with a pipeline
 * does the reset-or-deduct in one atomic step, so concurrent requests can
 * never overspend the daily allowance. Throws {@link InsufficientCreditsError}
 * when the same-day balance is below `cost`.
 */
export async function spendAiCredits(
  userId: string,
  cost: number,
): Promise<{ remaining: number }> {
  const today = dayKey(new Date());

  const spent = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ aiCreditsDay: { $ne: today } }, { aiCredits: { $gte: cost } }],
    },
    [
      {
        $set: {
          aiCredits: {
            $cond: [
              { $eq: ["$aiCreditsDay", today] },
              { $subtract: ["$aiCredits", cost] },
              { $subtract: [AI_CREDITS_PER_DAY, cost] },
            ],
          },
          aiCreditsDay: today,
        },
      },
    ],
    { new: true },
  ).lean();

  if (!spent) {
    throw new InsufficientCreditsError();
  }

  return { remaining: spent.aiCredits };
}

/**
 * Give back `cost` credits after a failed AI request. Only refunds into the
 * current day's bucket — if the day rolled over mid-request the user already
 * has a fresh allowance, so refunding would over-credit them.
 */
export async function refundAiCredits(userId: string, cost: number): Promise<void> {
  const today = dayKey(new Date());

  await UserModel.updateOne(
    { _id: userId, aiCreditsDay: today },
    { $inc: { aiCredits: cost } },
  );
}

export interface AiUsageLogInput {
  userId: string;
  operation: "generateWithAI" | "summarizeResponses";
  credits: number;
  status: "success" | "insufficient_credits" | "failed";
  error?: string | null;
}

/**
 * Append an entry to the AI usage audit log. Best-effort: the log must never
 * break the request it is recording, so failures are logged and swallowed.
 */
export async function recordAiUsage(input: AiUsageLogInput): Promise<void> {
  try {
    await AiUsageLogModel.create({
      userId: input.userId,
      operation: input.operation,
      credits: input.credits,
      status: input.status,
      error: input.error ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[credits] Unable to record AI usage:", error);
  }
}
