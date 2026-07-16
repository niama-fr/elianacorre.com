import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { Profiles } from "@ec/domain/schemas/profiles";
import type { PaginationOptions } from "convex/server";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getProfile = async (ctx: QueryCtx, id: Id<"profiles">) => await ctx.db.get("profiles", id);

export const getProfileByEmail = async (ctx: QueryCtx, email: string) =>
  await ctx.db
    .query("profiles")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

export const getProfileIdByEmail = async (ctx: QueryCtx, email: string) => {
  const profile = await getProfileByEmail(ctx, email);
  return profile?._id ?? null;
};

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireProfile = async (ctx: QueryCtx, id: Id<"profiles">) => {
  const doc = await getProfile(ctx, id);
  if (!doc) throw new ConvexError("UNKNOWN_PROFILE");
  return doc;
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateProfiles = async (ctx: QueryCtx, pagination: PaginationOptions) => await ctx.db.query("profiles").paginate(pagination);

export const takeProfiles = async (ctx: QueryCtx, limit: number) => await ctx.db.query("profiles").take(limit);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createContactProfile = async (ctx: MutationCtx, create: Omit<Profiles["Fields"], "role">) =>
  await ctx.db.insert("profiles", { ...create, role: "contact" });

// ENSURE ----------------------------------------------------------------------------------------------------------------------------------
export const ensureContactProfileId = async (ctx: MutationCtx, create: Omit<Profiles["Fields"], "role">) => {
  const profile = await getProfileByEmail(ctx, create.email);
  return profile?._id ?? (await createContactProfile(ctx, create));
};

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchProfile = async (ctx: MutationCtx, id: Id<"profiles">, patch: Partial<Profiles["Fields"]>) => {
  await ctx.db.patch("profiles", id, patch);
};

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export async function deleteProfileWithRelations(ctx: MutationCtx, id: Id<"profiles">) {
  const { _id: profileId, email } = await requireProfile(ctx, id);
  const [contactRequests, ebookIssuances, identities, loopsTasks, loopsWebhooks, restrictions, subscriptions] = await Promise.all([
    ctx.db
      .query("contactRequests")
      .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
      .collect(),
    ctx.db
      .query("ebookIssuances")
      .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
      .collect(),
    ctx.db
      .query("identities")
      .withIndex("by_profile_id_and_adapter", (q) => q.eq("profileId", profileId))
      .collect(),
    ctx.db
      .query("loopsTasks")
      .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
      .collect(),
    ctx.db
      .query("loopsWebhooks")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect(),
    ctx.db
      .query("newsRestrictions")
      .withIndex("by_profile_id_and_resolved_at", (q) => q.eq("profileId", profileId))
      .collect(),
    ctx.db
      .query("newsSubscriptions")
      .withIndex("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId))
      .collect(),
  ]);

  for (const issuance of ebookIssuances) {
    const downloads = await ctx.db
      .query("ebookDownloads")
      .withIndex("by_ebook_issuance_id", (q) => q.eq("ebookIssuanceId", issuance._id))
      .collect();
    for (const download of downloads) await ctx.db.delete(download._id);
    await ctx.db.delete(issuance._id);
  }

  for (const subscription of subscriptions) {
    const confirmations = await ctx.db
      .query("newsConfirmations")
      .withIndex("by_subscription_id", (q) => q.eq("subscriptionId", subscription._id))
      .collect();
    for (const confirmation of confirmations) await ctx.db.delete(confirmation._id);
    await ctx.db.delete(subscription._id);
  }

  for (const doc of [...contactRequests, ...identities, ...loopsTasks, ...loopsWebhooks, ...restrictions]) await ctx.db.delete(doc._id);
  await ctx.db.delete(profileId);
}
