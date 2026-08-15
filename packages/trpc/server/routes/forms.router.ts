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

import { proProcedure, protectedProcedure, publicProcedure, router } from "../trpc";

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
  generateWithAI: proProcedure.input(generateFormSchema).mutation(async ({ input }) => {
    try {
      return await generateFormDraft(input.prompt);
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw new TRPCError({
          code: error.code === "NOT_CONFIGURED" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to generate a form right now." });
    }
  }),
  summarizeResponses: proProcedure.input(summarizeResponsesSchema).query(async ({ ctx, input }) => {
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

      return { summary };
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw new TRPCError({
          code: error.code === "NOT_CONFIGURED" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to summarize responses right now." });
    }
  }),
});
