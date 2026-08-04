import { internal } from "@ec/backend/api";
import type { MutationCtx } from "@ec/backend/server";
import type { LegalTexts } from "@ec/domain/schemas/legal-texts";

import { createPrivacyNotice } from "../data/legal-texts";

// PUBLISH ---------------------------------------------------------------------------------------------------------------------------------
export const publishPrivacyNotice = async (ctx: MutationCtx, create: Omit<LegalTexts["Create"], "kind" | "publishedAt">) => {
  const privacyNoticeId = await createPrivacyNotice(ctx, { ...create, publishedAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.cache.revalidatePrivacyNotice, {});
  return privacyNoticeId;
};
