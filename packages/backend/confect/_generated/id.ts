import { GenericId } from "@confect/core";

export type TableNames = "contactRequests" | "ebookDownloads" | "ebookIssuances" | "ebooks" | "identities" | "legalTexts" | "loopsTasks" | "loopsWebhooks" | "newsConfirmations" | "newsRestrictions" | "newsSubscriptions" | "newsSuppressions" | "privacyAudits" | "privacyGrants" | "profiles" | "retentionRuns" | "travelPacks";

export const Id = <const TableName extends TableNames>(
  tableName: TableName,
) => GenericId.GenericId(tableName);
