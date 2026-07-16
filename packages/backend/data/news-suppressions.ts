import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSuppressionByEmail = async (ctx: QueryCtx, email: string) => {
  const canonicalEmailHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return await ctx.db
    .query("newsSuppressions")
    .withIndex("by_canonical_email_hash", (q) => q.eq("canonicalEmailHash", canonicalEmailHash))
    .unique();
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeNewsSuppressions = async (ctx: QueryCtx, limit: number) => await ctx.db.query("newsSuppressions").take(limit);

// ENSURE ----------------------------------------------------------------------------------------------------------------------------------
export const ensureNewsSuppression = async (ctx: MutationCtx, email: string) => {
  const existing = await getNewsSuppressionByEmail(ctx, email);
  if (existing) return existing._id;
  const canonicalEmailHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return await ctx.db.insert("newsSuppressions", { canonicalEmailHash });
};

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteNewsSuppressionByEmail = async (ctx: MutationCtx, email: string) => {
  const existing = await getNewsSuppressionByEmail(ctx, email);
  if (!existing) return false;
  await ctx.db.delete("newsSuppressions", existing._id);
  return true;
};
