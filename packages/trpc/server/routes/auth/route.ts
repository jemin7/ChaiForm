import { z, zodUndefinedModel } from "../../schema";
import { AuthServiceError, signup } from "@repo/services/auth";
import { getAiCreditBalance, userService } from "@repo/services/user";
import { signupSchema } from "@repo/validators/signup";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  providers: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/supported-providers"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          provider: z.enum(["google", "credentials"]),
          displayName: z.string(),
        }),
      ),
    )
    .query(async () => {
      return [
        { provider: "google", displayName: "Google" },
        { provider: "credentials", displayName: "Email and password" },
      ];
    }),
  signup: publicProcedure
    .input(signupSchema)
    .output(
      z.object({
        id: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const user = await signup(input);

        return {
          id: user.id,
          email: user.email,
        };
      } catch (error) {
        if (error instanceof AuthServiceError && error.code === "DUPLICATE_EMAIL") {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create account.",
        });
      }
    }),
  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z.string().nullable(),
        plan: z.enum(["free", "pro"]),
        aiCredits: z.object({
          remaining: z.number(),
          allowance: z.number(),
          resetsAt: z.string(),
        }),
      }),
    )
    .query(async ({ ctx }) => {
      // Lazily resets the daily balance if the stored day is stale, so the
      // UI always shows the correct remaining credits for today.
      const aiCredits = await getAiCreditBalance(ctx.dbUser.id);

      return {
        id: ctx.dbUser.id,
        name: ctx.dbUser.name,
        email: ctx.dbUser.email,
        image: ctx.dbUser.image,
        plan: ctx.dbUser.plan,
        aiCredits,
      };
    }),
  upgradeToPro: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/upgrade"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.object({ plan: z.enum(["free", "pro"]) }))
    .mutation(async () => {
      // Payment processing isn't wired up yet, so granting Pro for free would
      // unlock every paid feature. Refuse until a real payment flow exists.
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Pro upgrades are paused until payments are available.",
      });
    }),
});
