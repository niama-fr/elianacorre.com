import { createHashedToken, hashToken } from "@ec/domain/helpers/utils";
import { zNewsletterSubUpsert } from "@ec/domain/schemas/newsletter-subs";
import { z } from "zod";

import { fulfillEbookRequest } from "../ebook-grants";
import { enqueueSendConfirmationEmail, enqueueSyncContact } from "../loops-tasks";
import { clearConfirmableNewsletterBlock, getNewsletterBlockByEmail, getValidConfirmableNewsletterBlock } from "../newsletter-blocks";
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
    if (!sub) {
      const block = await getValidConfirmableNewsletterBlock(ctx, { confirmTokenHash, now });
      if (block === null) return { downloadToken: null, status: "invalid" as const };
      const profile = await getProfileByEmail(ctx, block.email);
      if (profile === null) return { downloadToken: null, status: "invalid" as const };
      await ctx.db.delete(block._id);
      await enqueueSyncContact(ctx, {
        idempotencyKey: `newsletter-contact-restoration:${block._id}:${confirmTokenHash.slice(0, 16)}`,
        profileId: profile._id,
        subscribed: true,
      });
      return { downloadToken: await fulfillEbookRequest(ctx, { now, profileId: profile._id }), status: "confirmed" as const };
    }

    const profile = await ctx.db.get("profiles", sub.profileId);
    if (profile === null) return { downloadToken: null, status: "invalid" as const };
    const block = await getNewsletterBlockByEmail(ctx, profile.email);
    if (block !== null && block.updatedAt > sub.requestedAt)
      await patchNewsletterSub(ctx, sub._id, { confirmTokenHash: null, confirmedAt: now });
    else {
      await clearConfirmableNewsletterBlock(ctx, profile.email, sub.requestedAt);
      await markNewsletterSubConfirmed(ctx, sub._id, { now, profileId: sub.profileId });
    }

    return { downloadToken: await fulfillEbookRequest(ctx, { now, profileId: sub.profileId }), status: "confirmed" as const };
  },
});

export const upsert = zMutation({
  args: zNewsletterSubUpsert,
  handler: async (ctx, { email, firstName, requestIp, website }) => {
    if (website !== "") return { accepted: true as const };
    const block = await getNewsletterBlockByEmail(ctx, email);
    if (block?.reason === "suppressed") return { accepted: true as const };

    if (block !== null) {
      const profile = await getProfileByEmail(ctx, email);
      if (profile === null) return { accepted: true as const };
      const { token: linkToken, tokenHash: confirmTokenHash } = await createHashedToken();
      const now = Date.now();
      await ctx.db.patch(block._id, { confirmRequestedAt: now, confirmTokenHash });
      await enqueueSendConfirmationEmail(ctx, {
        idempotencyKey: `delivery-restoration:${block._id}:${confirmTokenHash.slice(0, 16)}`,
        linkToken,
        profileId: profile._id,
      });
      return { accepted: true as const };
    }

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
