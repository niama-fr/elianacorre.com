import { createHashedToken, hashToken } from "@ec/domain/helpers/utils";
import { zNewsletterSubCreate } from "@ec/domain/schemas/newsletter-subs";
import { z } from "zod";

import { fulfillEbookRequest } from "../ebook-grants";
import { createConfirmationEmailProviderJob, scheduleEmailProviderJobRunner } from "../email-provider-jobs";
import { requireActiveNewsletterLegalBundle } from "../newsletter-legal-bundles";
import {
  createNewsletterSub,
  getCurrentNewsletterSub,
  getValidPendingNewsletterSub,
  markNewsletterSubConfirmed,
  patchNewsletterSub,
} from "../newsletter-subs";
import { ensureContactProfileId } from "../profiles";
import { zMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const confirm = zMutation({
  args: { token: z.string() },
  handler: async (ctx, { token: confirmToken }) => {
    const now = Date.now();
    const confirmTokenHash = await hashToken(confirmToken);
    const sub = await getValidPendingNewsletterSub(ctx, { confirmTokenHash, now });
    if (!sub) return { downloadToken: null, status: "invalid" as const };

    await markNewsletterSubConfirmed(ctx, sub._id, { now, profileId: sub.profileId });

    return { downloadToken: await fulfillEbookRequest(ctx, { now, profileId: sub.profileId }), status: "confirmed" as const };
  },
});

export const upsert = zMutation({
  args: zNewsletterSubCreate,
  handler: async (ctx, { email, firstName }) => {
    const now = Date.now();
    const profileId = await ensureContactProfileId(ctx, { email, firstName });
    const currentSub = await getCurrentNewsletterSub(ctx, profileId);

    if (currentSub?.confirmedAt) {
      await fulfillEbookRequest(ctx, { now, profileId });
      return { accepted: true as const };
    }

    const { token: linkToken, tokenHash: confirmTokenHash } = await createHashedToken();
    const { _id: legalBundleId } = await requireActiveNewsletterLegalBundle(ctx);
    const subId = currentSub?._id ?? (await createNewsletterSub(ctx, { confirmTokenHash, legalBundleId, profileId, requestedAt: now }));
    if (currentSub) await patchNewsletterSub(ctx, subId, { confirmTokenHash, legalBundleId, requestedAt: now });

    const emailProviderJobId = await createConfirmationEmailProviderJob(ctx, {
      idempotencyKey: `confirmation:${subId}:${confirmTokenHash.slice(0, 16)}`,
      linkToken,
      nextAttemptAt: now,
      profileId,
    });
    await scheduleEmailProviderJobRunner(ctx, emailProviderJobId);

    return { accepted: true as const };
  },
});
