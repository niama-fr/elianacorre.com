import type { Document } from "@confect/server";
import type schemaDefinition from "./schema";

export type ContactRequestsDoc = Document.Document<typeof schemaDefinition, "contactRequests">;
export type EbookDownloadsDoc = Document.Document<typeof schemaDefinition, "ebookDownloads">;
export type EbookIssuancesDoc = Document.Document<typeof schemaDefinition, "ebookIssuances">;
export type EbooksDoc = Document.Document<typeof schemaDefinition, "ebooks">;
export type IdentitiesDoc = Document.Document<typeof schemaDefinition, "identities">;
export type LegalTextsDoc = Document.Document<typeof schemaDefinition, "legalTexts">;
export type LoopsTasksDoc = Document.Document<typeof schemaDefinition, "loopsTasks">;
export type LoopsWebhooksDoc = Document.Document<typeof schemaDefinition, "loopsWebhooks">;
export type NewsConfirmationsDoc = Document.Document<typeof schemaDefinition, "newsConfirmations">;
export type NewsRestrictionsDoc = Document.Document<typeof schemaDefinition, "newsRestrictions">;
export type NewsSubscriptionsDoc = Document.Document<typeof schemaDefinition, "newsSubscriptions">;
export type NewsSuppressionsDoc = Document.Document<typeof schemaDefinition, "newsSuppressions">;
export type PrivacyAuditsDoc = Document.Document<typeof schemaDefinition, "privacyAudits">;
export type PrivacyGrantsDoc = Document.Document<typeof schemaDefinition, "privacyGrants">;
export type ProfilesDoc = Document.Document<typeof schemaDefinition, "profiles">;
export type RetentionRunsDoc = Document.Document<typeof schemaDefinition, "retentionRuns">;
export type TravelPacksDoc = Document.Document<typeof schemaDefinition, "travelPacks">;

export interface Docs {
  contactRequests: ContactRequestsDoc;
  ebookDownloads: EbookDownloadsDoc;
  ebookIssuances: EbookIssuancesDoc;
  ebooks: EbooksDoc;
  identities: IdentitiesDoc;
  legalTexts: LegalTextsDoc;
  loopsTasks: LoopsTasksDoc;
  loopsWebhooks: LoopsWebhooksDoc;
  newsConfirmations: NewsConfirmationsDoc;
  newsRestrictions: NewsRestrictionsDoc;
  newsSubscriptions: NewsSubscriptionsDoc;
  newsSuppressions: NewsSuppressionsDoc;
  privacyAudits: PrivacyAuditsDoc;
  privacyGrants: PrivacyGrantsDoc;
  profiles: ProfilesDoc;
  retentionRuns: RetentionRunsDoc;
  travelPacks: TravelPacksDoc;
}
