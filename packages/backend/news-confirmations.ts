import { verifyCapabilityToken } from "@ec/domain/helpers/utils";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import { zid } from "convex-helpers/server/zod4";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const NEWS_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsConfirmation = async (ctx: QueryCtx, id: Id<"newsConfirmations">) => await ctx.db.get("newsConfirmations", id);

export const getValidNewsConfirmation = async (ctx: QueryCtx, { now, secret, token }: { now: number; secret: string; token: string }) => {
  const capabilityId = await verifyCapabilityToken({ secret, token });
  const parsedId = zid("newsConfirmations").safeParse(capabilityId);
  if (!parsedId.success) return null;

  const confirmation = await getNewsConfirmation(ctx, parsedId.data);
  return confirmation && confirmation.expiresAt > now ? confirmation : null;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const replaceNewsConfirmation = async (ctx: MutationCtx, create: NewsConfirmations["Create"]) => {
  const existing = await ctx.db
    .query("newsConfirmations")
    .withIndex("by_subscription_id", (query) => query.eq("subscriptionId", create.subscriptionId))
    .collect();
  const deletions = [];
  for (const confirmation of existing) deletions.push(ctx.db.delete(confirmation._id));
  await Promise.all(deletions);
  return await ctx.db.insert("newsConfirmations", create);
};
