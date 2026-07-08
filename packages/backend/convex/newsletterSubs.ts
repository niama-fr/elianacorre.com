import { createHashedToken, hashToken } from "@ec/domain/helpers/utils";
import { zNewsletterSubUpsert } from "@ec/domain/schemas/newsletter-subs";
import { z } from "zod";

import { fulfillEbookRequest } from "../ebook-grants";
import { enqueueSendConfirmationEmail } from "../loops-tasks";
import { requireActiveNewsletterLegalBundle } from "../newsletter-legal-bundles";
import { tryConsumeNewsletterRateLimit } from "../newsletter-rate-limits";
import {
  createNewsletterSub,
  getCurrentNewsletterSub,
  getValidPendingNewsletterSub,
  markNewsletterSubConfirmed,
  patchNewsletterSub,
} from "../newsletter-subs";
import { createContactProfile, getProfileByEmail } from "../profiles";
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
  args: zNewsletterSubUpsert,
  handler: async (ctx, { email, firstName, requestIp, website }) => {
    if (website !== "") return { accepted: true as const };

    const now = Date.now();
    const profile = await getProfileByEmail(ctx, email);
    const currentSub = profile ? await getCurrentNewsletterSub(ctx, profile._id) : null;

    if (currentSub?.confirmedAt) {
      await fulfillEbookRequest(ctx, { now, profileId: currentSub.profileId });
      return { accepted: true as const };
    }

    const isAllowed = await tryConsumeNewsletterRateLimit(ctx, { email, requestIp });
    if (!isAllowed) return { accepted: true as const };

    const profileId = profile?._id ?? (await createContactProfile(ctx, { email, firstName }));

    const { token: linkToken, tokenHash: confirmTokenHash } = await createHashedToken();
    const { _id: legalBundleId } = await requireActiveNewsletterLegalBundle(ctx);
    const subId = currentSub?._id ?? (await createNewsletterSub(ctx, { confirmTokenHash, legalBundleId, profileId, requestedAt: now }));
    if (currentSub) await patchNewsletterSub(ctx, subId, { confirmTokenHash, legalBundleId, requestedAt: now });

    await enqueueSendConfirmationEmail(ctx, {
      idempotencyKey: `confirmation:${subId}:${confirmTokenHash.slice(0, 16)}`,
      linkToken,
      profileId,
    });

    return { accepted: true as const };
  },
});
