import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";

import { env, type QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSuppressionByEmail = async (ctx: QueryCtx, email: string) => {
  const canonicalEmailHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return await ctx.db
    .query("newsSuppressions")
    .withIndex("by_canonical_email_hash", (q) => q.eq("canonicalEmailHash", canonicalEmailHash))
    .unique();
};
