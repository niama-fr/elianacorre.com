import { zContactRequestFields, zLegacyContactFields } from "@ec/domain/schemas/contacts";
import { zEbookFields } from "@ec/domain/schemas/ebooks";
import {
  zEbookDownloadCapabilityFields,
  zLegalDocumentFields,
  zNewsletterEmailOutboxFields,
  zNewsletterLegalBundleFields,
  zNewsletterSubscriptionFields,
} from "@ec/domain/schemas/newsletter";
import { zProfileFields } from "@ec/domain/schemas/profiles";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  contactRequests: defineTable(zodOutputToConvex(zContactRequestFields)).index("by_profile", ["profileId"]),
  contacts: defineTable(zodOutputToConvex(zLegacyContactFields)),
  ebookDownloadCapabilities: defineTable(zodOutputToConvex(zEbookDownloadCapabilityFields)).index("by_token_hash", ["tokenHash"]),
  ebooks: defineTable(zodOutputToConvex(zEbookFields)).index("by_status", ["status"]).index("by_version", ["version"]),
  legalDocuments: defineTable(zodOutputToConvex(zLegalDocumentFields)).index("by_type_and_published_at", ["type", "publishedAt"]),
  newsletterEmailOutbox: defineTable(zodOutputToConvex(zNewsletterEmailOutboxFields))
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_status_and_next_attempt", ["status", "nextAttemptAt"]),
  newsletterLegalBundles: defineTable(zodOutputToConvex(zNewsletterLegalBundleFields)).index("by_published_at", ["publishedAt"]),
  newsletterSubscriptions: defineTable(zodOutputToConvex(zNewsletterSubscriptionFields))
    .index("by_confirmation_token_hash", ["confirmationTokenHash"])
    .index("by_profile_and_unsubscribed_at", ["profileId", "unsubscribedAt"]),
  profiles: defineTable(zodOutputToConvex(zProfileFields))
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_user", ["userId"]),
});
