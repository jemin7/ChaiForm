import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

export const protectedProcedure = tRPCContext.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      dbUser: ctx.session.user,
    },
  });
});

export const proProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.dbUser.plan !== "pro") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires the ChaiForm Pro plan.",
    });
  }

  return next({ ctx });
});
