import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeProfileContactRequests = async (ctx: QueryCtx, limit: number, profileId: Id<"profiles">) =>
  await ctx.db
    .query("contactRequests")
    .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
    .take(limit);

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteContactRequest = async (ctx: MutationCtx, id: Id<"contactRequests">) => {
  await ctx.db.delete("contactRequests", id);
};
