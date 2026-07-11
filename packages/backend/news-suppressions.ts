import { hashCanonicalEmail } from "@ec/domain/helpers/utils";

import type { QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSuppressionByEmail = async (ctx: QueryCtx, { email, secret }: { email: string; secret: string }) => {
  const canonicalEmailHash = await hashCanonicalEmail({ email, secret });
  return await ctx.db
    .query("newsSuppressions")
    .withIndex("by_canonical_email_hash", (query) => query.eq("canonicalEmailHash", canonicalEmailHash))
    .unique();
};
