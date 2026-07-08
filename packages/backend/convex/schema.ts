import { zContactRequestFields } from "@ec/domain/schemas/contact-requests";
import { zEbookGrantFields } from "@ec/domain/schemas/ebook-grants";
import { zEbookFields } from "@ec/domain/schemas/ebooks";
import { zIdentityFields } from "@ec/domain/schemas/identities";
import { zLegalTextFields } from "@ec/domain/schemas/legal-texts";
import { zLoopsTaskFields } from "@ec/domain/schemas/loops-tasks";
import { zLoopsWebhookEventFields } from "@ec/domain/schemas/loops-webhook-events";
import { zNewsletterBlockFields } from "@ec/domain/schemas/newsletter-blocks";
import { zNewsletterLegalBundleFields } from "@ec/domain/schemas/newsletter-legal-bundles";
import { zNewsletterSubFields } from "@ec/domain/schemas/newsletter-subs";
import { zProfileFields } from "@ec/domain/schemas/profiles";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  contactRequests: defineTable(zodOutputToConvex(zContactRequestFields)).index("by_profile_id", ["profileId"]),
  ebookGrants: defineTable(zodOutputToConvex(zEbookGrantFields)).index("by_token_hash", ["tokenHash"]),
  ebooks: defineTable(zodOutputToConvex(zEbookFields)).index("by_status", ["status"]).index("by_version", ["version"]),
  identities: defineTable(zodOutputToConvex(zIdentityFields))
    .index("by_profile_id_and_adapter", ["profileId", "adapter"])
    .index("by_adapter_and_adapter_id", ["adapter", "adapterId"]),
  legalTexts: defineTable(zodOutputToConvex(zLegalTextFields)).index("by_kind_and_published_at", ["kind", "publishedAt"]),
  loopsTasks: defineTable(zodOutputToConvex(zLoopsTaskFields)).index("by_idempotency_key", ["idempotencyKey"]),
  loopsWebhookEvents: defineTable(zodOutputToConvex(zLoopsWebhookEventFields)).index("by_webhook_id", ["webhookId"]),
  newsletterBlocks: defineTable(zodOutputToConvex(zNewsletterBlockFields))
    .index("by_email", ["email"])
    .index("by_confirm_token_hash", ["confirmTokenHash"]),
  newsletterLegalBundles: defineTable(zodOutputToConvex(zNewsletterLegalBundleFields)).index("by_published_at", ["publishedAt"]),
  newsletterSubs: defineTable(zodOutputToConvex(zNewsletterSubFields))
    .index("by_confirm_token_hash", ["confirmTokenHash"])
    .index("by_profile_id_and_unsubscribed_at", ["profileId", "unsubscribedAt"])
    .index("by_profile_id_and_confirmed_at", ["profileId", "confirmedAt"]),
  profiles: defineTable(zodOutputToConvex(zProfileFields)).index("by_email", ["email"]).index("by_role", ["role"]),
});
