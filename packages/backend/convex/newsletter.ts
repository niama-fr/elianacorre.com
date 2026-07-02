import { CURRENT_NEWSLETTER_LEGAL_COPY, parseNewsletterSubscription } from "@ec/domain/schemas/newsletter";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { env } from "./_generated/server";
import { zInternalAction, zInternalMutation, zInternalQuery, zMutation } from "./zod";

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;
const EMAIL_CLAIM_LEASE_MS = 5 * 60 * 1000;
const EMAIL_MAX_ATTEMPTS = 8;
const EMAIL_RETRY_BASE_MS = 60 * 1000;
const EMAIL_RETRY_MAX_MS = 60 * 60 * 1000;

type EmailClaim = {
  attempts: number;
  firstName?: string;
  idempotencyKey: string;
  kind: "confirmation" | "ebook-delivery";
  linkToken: string;
  recipient: string;
};

type EmailResult = { retryAt: number | null } | null;

const findPublishedByProfileId = async (ctx: MutationCtx) => {
  const admin = await ctx.db
    .query("profiles")
    .withIndex("by_role", (query) => query.eq("role", "admin"))
    .first();
  return admin?._id ?? null;
};

const getActiveNewsletterLegalBundleId = async (ctx: MutationCtx): Promise<Id<"newsletterLegalBundles"> | null> => {
  const bundle = await ctx.db
    .query("newsletterLegalBundles")
    .withIndex("by_published_at", (query) => query.gt("publishedAt", null))
    .order("desc")
    .first();
  return bundle?._id ?? null;
};

const insertPublishedLegalDocument = async (
  ctx: MutationCtx,
  values: { content: string; publishedAt: number; publishedBy: Id<"profiles"> | null; type: "newsletter-consent" | "privacy-notice" }
) => await ctx.db.insert("legalDocuments", values);

const createInitialNewsletterLegalBundle = async (ctx: MutationCtx, now: number): Promise<Id<"newsletterLegalBundles">> => {
  const publishedBy = await findPublishedByProfileId(ctx);
  const consentDocumentId = await insertPublishedLegalDocument(ctx, {
    content: CURRENT_NEWSLETTER_LEGAL_COPY.consent.content,
    publishedAt: now,
    publishedBy,
    type: "newsletter-consent",
  });
  const privacyDocumentId = await insertPublishedLegalDocument(ctx, {
    content: CURRENT_NEWSLETTER_LEGAL_COPY.privacy.content,
    publishedAt: now,
    publishedBy,
    type: "privacy-notice",
  });
  return await ctx.db.insert("newsletterLegalBundles", {
    consentDocumentId,
    privacyDocumentId,
    publishedAt: now,
    publishedBy,
  });
};

const getOrCreateActiveNewsletterLegalBundleId = async (ctx: MutationCtx, now: number): Promise<Id<"newsletterLegalBundles">> =>
  (await getActiveNewsletterLegalBundleId(ctx)) ?? (await createInitialNewsletterLegalBundle(ctx, now));

const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const issueEbookDownloadCapability = async (ctx: MutationCtx, profile: Doc<"profiles">, now: number) => {
  const ebook = await ctx.db
    .query("ebooks")
    .withIndex("by_status", (query) => query.eq("status", "published"))
    .unique();
  if (ebook === null) return null;

  const downloadToken = crypto.randomUUID();
  const capabilityId = await ctx.db.insert("ebookDownloadCapabilities", {
    issuedAt: now,
    profileId: profile._id,
    tokenHash: await hashToken(downloadToken),
  });
  const outboxId = await ctx.db.insert("newsletterEmailOutbox", {
    attempts: 0,
    idempotencyKey: `ebook-delivery:${capabilityId}`,
    kind: "ebook-delivery",
    lastError: null,
    leaseExpiresAt: null,
    linkToken: downloadToken,
    nextAttemptAt: now,
    profileId: profile._id,
    sentAt: null,
    status: "pending",
  });
  await ctx.scheduler.runAfter(0, internal.newsletter.sendEmail, { outboxId });
  return { ebookId: ebook._id, token: downloadToken };
};

export const requestSubscription = zMutation({
  args: {
    consent: z.literal(true),
    email: z.string(),
    firstName: z.string().optional(),
  },
  handler: async (ctx, values) => {
    const subscription = parseNewsletterSubscription(values);
    const now = Date.now();
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", subscription.email))
      .unique();
    const profileValues = subscription.firstName === undefined ? {} : { firstName: subscription.firstName };
    const profileId =
      existingProfile?._id ??
      (await ctx.db.insert("profiles", {
        email: subscription.email,
        ...profileValues,
        role: "contact",
        userId: null,
      }));

    if (existingProfile !== null && subscription.firstName !== undefined) await ctx.db.patch(existingProfile._id, profileValues);
    const profile = await ctx.db.get("profiles", profileId);
    if (profile === null) throw new Error("Newsletter profile was not found");
    const activeConsent = await ctx.db
      .query("newsletterSubscriptions")
      .withIndex("by_profile_and_unsubscribed_at", (query) => query.eq("profileId", profileId).eq("unsubscribedAt", null))
      .filter((query) => query.neq(query.field("confirmedAt"), null))
      .unique();
    if (activeConsent !== null) {
      await issueEbookDownloadCapability(ctx, profile, now);
      return { accepted: true as const };
    }

    const openSubscription = await ctx.db
      .query("newsletterSubscriptions")
      .withIndex("by_profile_and_unsubscribed_at", (query) => query.eq("profileId", profileId).eq("unsubscribedAt", null))
      .filter((query) => query.eq(query.field("confirmedAt"), null))
      .unique();

    const linkToken = crypto.randomUUID();
    const confirmationTokenHash = await hashToken(linkToken);
    const legalBundleId = await getOrCreateActiveNewsletterLegalBundleId(ctx, now);
    const subscriptionId =
      openSubscription?._id ??
      (await ctx.db.insert("newsletterSubscriptions", {
        confirmationTokenHash,
        confirmedAt: null,
        legalBundleId,
        profileId,
        requestedAt: now,
        unsubscribedAt: null,
      }));
    if (openSubscription !== null) await ctx.db.patch(openSubscription._id, { confirmationTokenHash, legalBundleId, requestedAt: now });
    const outboxId = await ctx.db.insert("newsletterEmailOutbox", {
      attempts: 0,
      idempotencyKey: `confirmation:${subscriptionId}:${confirmationTokenHash.slice(0, 16)}`,
      kind: "confirmation",
      lastError: null,
      leaseExpiresAt: null,
      linkToken,
      nextAttemptAt: now,
      profileId,
      sentAt: null,
      status: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.newsletter.sendEmail, { outboxId });

    return { accepted: true as const };
  },
});

export const confirmSubscription = zMutation({
  args: { token: z.string() },
  handler: async (ctx, { token }) => {
    const now = Date.now();
    const confirmationTokenHash = await hashToken(token);
    const subscription = await ctx.db
      .query("newsletterSubscriptions")
      .withIndex("by_confirmation_token_hash", (query) => query.eq("confirmationTokenHash", confirmationTokenHash))
      .unique();
    const isInvalid =
      subscription === null ||
      subscription.confirmedAt !== null ||
      subscription.unsubscribedAt !== null ||
      subscription.requestedAt + CONFIRMATION_TTL_MS <= now;
    if (isInvalid) return { status: "invalid" as const };

    const profile = await ctx.db.get("profiles", subscription.profileId);
    if (profile === null) throw new Error("Newsletter profile was not found");
    const access = await issueEbookDownloadCapability(ctx, profile, now);
    if (access === null) return { status: "unavailable" as const };
    await ctx.db.patch(subscription._id, { confirmationTokenHash: null, confirmedAt: now });

    return { ebookId: access.ebookId, status: "confirmed" as const, subscriptionId: subscription._id, token: access.token };
  },
});

export const resolveEbookDownload = zInternalQuery({
  args: { token: z.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);
    const capability = await ctx.db
      .query("ebookDownloadCapabilities")
      .withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash))
      .unique();
    if (capability === null || capability.issuedAt + DOWNLOAD_TTL_MS <= Date.now()) return null;

    const confirmedSubscription = await ctx.db
      .query("newsletterSubscriptions")
      .withIndex("by_profile_and_unsubscribed_at", (query) => query.eq("profileId", capability.profileId))
      .filter((query) => query.neq(query.field("confirmedAt"), null))
      .first();
    if (confirmedSubscription === null) return null;
    const ebook = await ctx.db
      .query("ebooks")
      .withIndex("by_status", (query) => query.eq("status", "published"))
      .unique();
    if (ebook === null) return null;
    return { fileName: ebook.fileName, storageId: ebook.storageId };
  },
});

export const claimEmail = zInternalMutation({
  args: { outboxId: zid("newsletterEmailOutbox") },
  handler: async (ctx, { outboxId }) => {
    const now = Date.now();
    const email = await ctx.db.get("newsletterEmailOutbox", outboxId);
    if (email === null) return null;
    const isPendingAndReady = email.status === "pending" && email.nextAttemptAt <= now;
    const isAbandonedClaim = email.status === "sending" && email.leaseExpiresAt !== null && email.leaseExpiresAt <= now;
    if (!(isPendingAndReady || isAbandonedClaim)) return null;
    if (isAbandonedClaim && email.attempts >= EMAIL_MAX_ATTEMPTS) {
      await ctx.db.patch(email._id, {
        lastError: "Delivery lease expired after the final attempt",
        leaseExpiresAt: null,
        status: "failed",
      });
      return null;
    }
    const profile = await ctx.db.get("profiles", email.profileId);
    if (profile === null) throw new Error("Newsletter profile was not found");
    const attempts = email.attempts + 1;
    await ctx.db.patch(email._id, { attempts, leaseExpiresAt: now + EMAIL_CLAIM_LEASE_MS, status: "sending" });
    await ctx.scheduler.runAfter(EMAIL_CLAIM_LEASE_MS, internal.newsletter.sendEmail, { outboxId });
    return {
      attempts,
      firstName: profile.firstName,
      idempotencyKey: email.idempotencyKey,
      kind: email.kind,
      linkToken: email.linkToken,
      recipient: profile.email,
    };
  },
});

export const recordEmailResult = zInternalMutation({
  args: {
    attempt: z.int().positive(),
    error: z.string().optional(),
    outboxId: zid("newsletterEmailOutbox"),
    success: z.boolean(),
  },
  handler: async (ctx, { attempt, error, outboxId, success }) => {
    const email = await ctx.db.get("newsletterEmailOutbox", outboxId);
    if (email === null || email.status !== "sending" || email.attempts !== attempt) return null;
    const now = Date.now();
    if (success) {
      await ctx.db.patch(email._id, { lastError: null, leaseExpiresAt: null, sentAt: now, status: "sent" });
      return { retryAt: null };
    }
    if (email.attempts >= EMAIL_MAX_ATTEMPTS) {
      await ctx.db.patch(email._id, { lastError: error ?? "Unknown delivery error", leaseExpiresAt: null, status: "failed" });
      return { retryAt: null };
    }
    const retryDelay = Math.min(EMAIL_RETRY_BASE_MS * 2 ** (email.attempts - 1), EMAIL_RETRY_MAX_MS);
    const retryAt = now + retryDelay;
    await ctx.db.patch(email._id, {
      lastError: error ?? "Unknown delivery error",
      leaseExpiresAt: null,
      nextAttemptAt: retryAt,
      status: "pending",
    });
    return { retryAt };
  },
});

export const sendEmail = zInternalAction({
  args: { outboxId: zid("newsletterEmailOutbox") },
  handler: async (ctx, { outboxId }) => {
    const email: EmailClaim | null = await ctx.runMutation(internal.newsletter.claimEmail, { outboxId });
    if (email === null) return;
    const link = new URL(email.kind === "confirmation" ? "/newsletter/confirmation" : "/newsletter/ebook", env.SITE_URL);
    link.searchParams.set("token", email.linkToken);
    const dataVariables = {
      ...(email.firstName === undefined ? {} : { firstName: email.firstName }),
      ...(email.kind === "confirmation" ? { confirmationUrl: link.href } : { downloadUrl: link.href }),
    };

    try {
      const response = await fetch("https://app.loops.so/api/v1/transactional", {
        body: JSON.stringify({
          dataVariables,
          email: email.recipient,
          transactionalId: email.kind === "confirmation" ? env.LOOPS_CONFIRMATION_TRANSACTIONAL_ID : env.LOOPS_EBOOK_TRANSACTIONAL_ID,
        }),
        headers: {
          Authorization: `Bearer ${env.LOOPS_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": email.idempotencyKey,
        },
        method: "POST",
      });
      if (!(response.ok || response.status === 409)) {
        const responseText = await response.text();
        const detail = responseText.slice(0, 500);
        throw new Error(`Loops returned ${response.status}: ${detail}`);
      }
      const deliveryResult: EmailResult = await ctx.runMutation(internal.newsletter.recordEmailResult, {
        attempt: email.attempts,
        outboxId,
        success: true,
      });
      if (deliveryResult === null) return null;
    } catch (error) {
      const result: EmailResult = await ctx.runMutation(internal.newsletter.recordEmailResult, {
        attempt: email.attempts,
        error: error instanceof Error ? error.message : "Unknown delivery error",
        outboxId,
        success: false,
      });
      if (result?.retryAt !== null && result?.retryAt !== undefined)
        await ctx.scheduler.runAfter(Math.max(0, result.retryAt - Date.now()), internal.newsletter.sendEmail, { outboxId });
    }
  },
});
