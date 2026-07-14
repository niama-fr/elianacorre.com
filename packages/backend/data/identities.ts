import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { Identities } from "@ec/domain/schemas/identities";

// CONST -----------------------------------------------------------------------------------------------------------------------------------
const AUTH_ADAPTER = "better-auth";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getIdentityByAdapterId = async (ctx: QueryCtx, adapterId: string) =>
  await ctx.db
    .query("identities")
    .withIndex("by_adapter_and_adapter_id", (q) => q.eq("adapter", AUTH_ADAPTER).eq("adapterId", adapterId))
    .unique();

export const getIdentityByProfile = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("identities")
    .withIndex("by_profile_id_and_adapter", (q) => q.eq("profileId", profileId).eq("adapter", AUTH_ADAPTER))
    .unique();

// CREATE -------------------------------------------------------------------------------------------------------------------------------------
export const createIdentity = async (ctx: MutationCtx, create: Omit<Identities["Fields"], "adapter">) =>
  await ctx.db.insert("identities", { adapter: AUTH_ADAPTER, ...create });
