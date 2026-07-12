import { zContactRequestFields } from "@ec/domain/schemas/contact-requests";
import { zEbookDownloadFields } from "@ec/domain/schemas/ebook-downloads";
import { zEbookIssuanceFields } from "@ec/domain/schemas/ebook-issuances";
import { zEbookFields } from "@ec/domain/schemas/ebooks";
import { zIdentityFields } from "@ec/domain/schemas/identities";
import { zLegalTextFields } from "@ec/domain/schemas/legal-texts";
import { zLoopsTaskFields } from "@ec/domain/schemas/loops-tasks";
import { zLoopsWebhookFields } from "@ec/domain/schemas/loops-webhooks";
import { zNewsConfirmationFields } from "@ec/domain/schemas/news-confirmations";
import { zNewsRestrictionFields } from "@ec/domain/schemas/news-restrictions";
import { zNewsSubscriptionFields } from "@ec/domain/schemas/news-subscriptions";
import { zNewsSuppressionFields } from "@ec/domain/schemas/news-suppressions";
import { zNewsletterLegalBundleFields } from "@ec/domain/schemas/newsletter-legal-bundles";
import { zProfileFields } from "@ec/domain/schemas/profiles";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  contactRequests: defineTable(zodOutputToConvex(zContactRequestFields)).index("by_profile_id", ["profileId"]),
  ebookDownloads: defineTable(zodOutputToConvex(zEbookDownloadFields)).index("by_ebook_issuance_id", ["ebookIssuanceId"]),
  ebookIssuances: defineTable(zodOutputToConvex(zEbookIssuanceFields)).index("by_profile_id", ["profileId"]),
  ebooks: defineTable(zodOutputToConvex(zEbookFields)).index("by_status", ["status"]).index("by_version", ["version"]),
  identities: defineTable(zodOutputToConvex(zIdentityFields))
    .index("by_profile_id_and_adapter", ["profileId", "adapter"])
    .index("by_adapter_and_adapter_id", ["adapter", "adapterId"]),
  legalTexts: defineTable(zodOutputToConvex(zLegalTextFields)).index("by_kind_and_published_at", ["kind", "publishedAt"]),
  loopsTasks: defineTable(zodOutputToConvex(zLoopsTaskFields)).index("by_idempotency_key", ["idempotencyKey"]),
  loopsWebhooks: defineTable(zodOutputToConvex(zLoopsWebhookFields)).index("by_webhook_id", ["webhookId"]),
  newsConfirmations: defineTable(zodOutputToConvex(zNewsConfirmationFields)).index("by_subscription_id", ["subscriptionId"]),
  newsRestrictions: defineTable(zodOutputToConvex(zNewsRestrictionFields))
    .index("by_profile_id_and_resolved_at", ["profileId", "resolvedAt"])
    .index("by_profile_id_and_restricted_at", ["profileId", "restrictedAt"]),
  newsSubscriptions: defineTable(zodOutputToConvex(zNewsSubscriptionFields))
    .index("by_profile_id_and_unsubscribed_at", ["profileId", "unsubscribedAt"])
    .index("by_profile_id_and_confirmed_at", ["profileId", "confirmedAt"]),
  newsSuppressions: defineTable(zodOutputToConvex(zNewsSuppressionFields)).index("by_canonical_email_hash", ["canonicalEmailHash"]),
  newsletterLegalBundles: defineTable(zodOutputToConvex(zNewsletterLegalBundleFields)).index("by_published_at", ["publishedAt"]),
  profiles: defineTable(zodOutputToConvex(zProfileFields)).index("by_email", ["email"]).index("by_role", ["role"]),
});
