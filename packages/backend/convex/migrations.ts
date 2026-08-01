import { Migrations } from "@convex-dev/migrations";
import { ConvexError } from "convex/values";

import { components } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillSubscriptionPrivacyNoticeId = async (ctx: MutationCtx, subscription: Doc<"newsSubscriptions">) => {
  if (subscription.privacyNoticeId !== undefined) return;
  if (subscription.legalBundleId === undefined) throw new ConvexError("MISSING_SUBSCRIPTION_LEGAL_BUNDLE");

  const bundle = await ctx.db.get("newsletterLegalBundles", subscription.legalBundleId);
  if (bundle === null) throw new ConvexError("MISSING_SUBSCRIPTION_LEGAL_BUNDLE");

  const privacyNotice = await ctx.db.get("legalTexts", bundle.privacyNoticeId);
  if (privacyNotice?.kind !== "privacyNotice" || (privacyNotice.publishedAt ?? Number.POSITIVE_INFINITY) > subscription.requestedAt)
    throw new ConvexError("INVALID_SUBSCRIPTION_PRIVACY_NOTICE");

  return { privacyNoticeId: privacyNotice._id };
};

export const backfillSubscriptionPrivacyNoticeIds = migrations.define({
  migrateOne: backfillSubscriptionPrivacyNoticeId,
  table: "newsSubscriptions",
});
