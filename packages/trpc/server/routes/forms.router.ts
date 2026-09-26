import { TRPCError } from "@trpc/server";
import {
  AiServiceError,
  generateFormDraft,
  summarizeResponses as runResponseSummary,
} from "@repo/services/ai";
import {
  createForm,
  deleteForm,
  FormServiceError,
  getAllForms,
  getFormAnalytics,
  getFormById,
  getFormResponses,
  getPublicFormBySlug,
  getResponseActivity,
  publishForm,
  submitResponse,
  unpublishForm,
  updateForm,
} from "@repo/services/forms";
import {
  FORM_GENERATION_CREDITS,
  InsufficientCreditsError,
  recordAiUsage,
  refundAiCredits,
  RESPONSE_SUMMARY_CREDITS,
  spendAiCredits,
  type AiUsageLogInput,
} from "@repo/services/user";
import type { AiUsageStatus } from "@repo/database";
import { generateFormSchema, summarizeResponsesSchema } from "@repo/validators/ai";
import { createFormSchema } from "@repo/validators/create-form";
import { publishFormSchema } from "@repo/validators/publish-form";
import { getPublicFormSchema, submitResponseSchema } from "@repo/validators/submit-response";
import {
  deleteFormSchema,
  getFormByIdSchema,
  getResponsesSchema,
  updateFormSchema,
} from "@repo/validators/update-form";

import { protectedProcedure, publicProcedure, router } from "../trpc";

/** Finalize an AI request: record usage (and refund credits on failure). */
type AiRequestDone = (outcome: AiUsageStatus, error?: string | null) => Promise<void>;

/** Turn a raw AI error into a user-facing message worth showing in a toast. */
function aiUserMessage(error: unknown): string {
  if (error instanceof AiServiceError) {
    // 429 = the provider quota/rate limit is exhausted (Google returns 429
    // with a JSON body even when the key is fine), 5xx = the provider is
    // having a bad day. Both recover on their own — say so instead of the
    // cryptic "Unable to generate a form right now."
    if (error.code === "NOT_CONFIGURED") {
      return error.message;
    }

    if (error.status === 429) {
      return "Our AI provider is rate-limiting us right now. Please try again in a few minutes."
    }

    return "The AI service is temporarily unavailable. Please try again in a minute.";
  }

  return "Unable to complete the AI request right now.";
}

/**
 * Spend AI credits before an AI request and refund them if it fails. Pro users
 * are unlimited (cost 0, no spend/refund).
 *
 * Returns a function that records the outcome in the usage log; the caller
 * must call it once the AI request finishes so the log reflects what actually
 * happened (credits deducted vs. refunded).
 */
function aiCreditsGate(userId: string, plan: "free" | "pro", cost: number) {
  const isPro = plan === "pro";
  const charged = isPro ? 0 : cost;

  if (!isPro) {
    return async (operation: AiUsageLogInput["operation"]): Promise<AiRequestDone> => {
      try {
        await spendAiCredits(userId, cost);
      } catch (error) {
        if (error instanceof InsufficientCreditsError) {
          await recordAiUsage({
            userId,
            operation,
            credits: 0,
            status: "insufficient_credits",
            error: error.message,
          });
          throw new TRPCError({ code: "FORBIDDEN", message: error.message });
        }

        throw error;
      }

      return async (outcome: AiUsageStatus, error?: string | null) => {
        // Refund before the error propagates so a failed AI request never
        // silently consumes the user's credit. Provider outages are never the
        // user's fault — refund those too.
        if (outcome === "failed" || outcome === "provider_error") {
          try {
            await refundAiCredits(userId, cost);
          } catch (refundError) {
            console.error("[credits] Refund failed:", refundError);
          }
        }

        await recordAiUsage({
          userId,
          operation,
          credits: outcome === "success" ? charged : 0,
          status: outcome,
          error,
        });
      };
    };
  }

  return async (operation: AiUsageLogInput["operation"]): Promise<AiRequestDone> => {
    return async (outcome: AiUsageStatus, error?: string | null) => {
      await recordAiUsage({
        userId,
        operation,
        credits: 0,
        status: outcome,
        error,
      });
    };
  };
}

function mapFormError(error: unknown): never {
  if (error instanceof FormServiceError) {
    if (error.code === "NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }

    if (error.code === "SLUG_TAKEN") {
      throw new TRPCError({ code: "CONFLICT", message: error.message });
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to complete request." });
}

export const formsRouter = router({
  create: protectedProcedure.input(createFormSchema).mutation(async ({ ctx, input }) => {
    try {
      return await createForm(ctx.dbUser.id, input);
    } catch (error) {
      mapFormError(error);
    }
  }),
  update: protectedProcedure.input(updateFormSchema).mutation(async ({ ctx, input }) => {
    try {
      return await updateForm(ctx.dbUser.id, input);
    } catch (error) {
      mapFormError(error);
    }
  }),
  delete: protectedProcedure.input(deleteFormSchema).mutation(async ({ ctx, input }) => {
    try {
      return await deleteForm(ctx.dbUser.id, input.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  publish: protectedProcedure.input(publishFormSchema).mutation(async ({ ctx, input }) => {
    try {
      return await publishForm(ctx.dbUser.id, input.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  unpublish: protectedProcedure.input(publishFormSchema).mutation(async ({ ctx, input }) => {
    try {
      return await unpublishForm(ctx.dbUser.id, input.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  getById: protectedProcedure.input(getFormByIdSchema).query(async ({ ctx, input }) => {
    try {
      return await getFormById(ctx.dbUser.id, input.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  getAllMine: protectedProcedure.query(async ({ ctx }) => {
    return getAllForms(ctx.dbUser.id);
  }),
  getBySlug: publicProcedure.input(getPublicFormSchema).query(async ({ ctx, input }) => {
    try {
      return await getPublicFormBySlug(input.slug, ctx.dbUser?.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  submit: publicProcedure.input(submitResponseSchema).mutation(async ({ ctx, input }) => {
    // Honeypot spam trap: bots that fill every field get a fake success so
    // they can't tell they were caught — the response is never stored.
    if (input.honeypot) {
      return { id: "spam", formId: "", submittedAt: new Date(), answers: [] };
    }

    try {
      return await submitResponse(input, ctx.dbUser?.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  getResponses: protectedProcedure.input(getResponsesSchema).query(async ({ ctx, input }) => {
    try {
      return await getFormResponses(ctx.dbUser.id, input.id, {
        page: input.page,
        pageSize: input.pageSize,
      });
    } catch (error) {
      mapFormError(error);
    }
  }),
  getAnalytics: protectedProcedure.input(getFormByIdSchema).query(async ({ ctx, input }) => {
    try {
      return await getFormAnalytics(ctx.dbUser.id, input.id);
    } catch (error) {
      mapFormError(error);
    }
  }),
  activity: protectedProcedure.query(async ({ ctx }) => {
    return getResponseActivity(ctx.dbUser.id);
  }),
  generateWithAI: protectedProcedure.input(generateFormSchema).mutation(async ({ ctx, input }) => {
    const gate = aiCreditsGate(ctx.dbUser.id, ctx.dbUser.plan, FORM_GENERATION_CREDITS);
    const done = await gate("generateWithAI");

    try {
      const draft = await generateFormDraft(input.prompt);
      await done("success");
      return draft;
    } catch (error) {
      // Always log the underlying cause — the client-facing messages below are
      // deliberately vague, so this is the only place the real reason shows up.
      console.error("[forms.generateWithAI] failed:", error);

      const isProviderError = error instanceof AiServiceError && error.code !== "NOT_CONFIGURED";
      await done(isProviderError ? "provider_error" : "failed", error instanceof Error ? error.message : "Unknown error");

      if (error instanceof AiServiceError) {
        throw new TRPCError({
          code: error.code === "NOT_CONFIGURED" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: aiUserMessage(error),
        });
      }

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: aiUserMessage(error) });
    }
  }),
  summarizeResponses: protectedProcedure
    .input(summarizeResponsesSchema)
    .mutation(async ({ ctx, input }) => {
      // A mutation (not a query) so each explicit user action costs exactly one
      // credit — queries get re-run by React Query on refetch/cache invalidation
      // and would silently charge again.
      const gate = aiCreditsGate(ctx.dbUser.id, ctx.dbUser.plan, RESPONSE_SUMMARY_CREDITS);
      const done = await gate("summarizeResponses");

      try {
        const { form, responses } = await getFormResponses(ctx.dbUser.id, input.id);

        const fields = new Map<
          string,
          { label: string; type: string; answers: Array<string | number | boolean | string[] | { name: string; type: string; size: number; data: string } | null> }
        >();

        for (const response of responses) {
          for (const answer of response.answers) {
            const entry = fields.get(answer.fieldId) ?? { label: answer.label, type: answer.type, answers: [] };
            entry.answers.push(answer.value);
            fields.set(answer.fieldId, entry);
          }
        }

        const summary = await runResponseSummary({
          formTitle: form.title,
          totalResponses: responses.length,
          fields: [...fields.values()].map((field) => ({
            label: field.label,
            type: field.type,
            answerCount: field.answers.filter((value) => value !== null && value !== "").length,
            answers: field.answers,
          })),
        });

        await done("success");
        return { summary };
      } catch (error) {
        // Same rationale as generateWithAI: log the real cause for debugging.
        console.error("[forms.summarizeResponses] failed:", error);

        const isProviderError = error instanceof AiServiceError && error.code !== "NOT_CONFIGURED";
        await done(isProviderError ? "provider_error" : "failed", error instanceof Error ? error.message : "Unknown error");

        if (error instanceof AiServiceError) {
          throw new TRPCError({
            code: error.code === "NOT_CONFIGURED" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
            message: aiUserMessage(error),
          });
        }

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: aiUserMessage(error) });
      }
    }),
});
