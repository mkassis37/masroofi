import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  cloud: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const row = await db.getFinanceCloud(ctx.user.id);
      return row ? { payload: row.payload, updatedAt: row.updatedAt } : null;
    }),
    save: protectedProcedure.input(z.object({ payload: z.string().min(2).max(1000000) })).mutation(async ({ ctx, input }) => {
      await db.saveFinanceCloud(ctx.user.id, input.payload);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
