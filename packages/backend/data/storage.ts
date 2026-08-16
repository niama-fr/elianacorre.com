import type { AuthenticatedMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getStorageDoc = async (ctx: QueryCtx, id: Id<"_storage">) => await ctx.db.system.get("_storage", id);

export const getStorageUrl = async (ctx: QueryCtx, id: Id<"_storage">) => await ctx.storage.getUrl(id);

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteStorage = async (ctx: AuthenticatedMutationCtx, id: Id<"_storage">) => {
  await ctx.storage.delete(id);
};
