import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookDownloadFields = S.Struct({
  ebookIssuanceId: GenericId.GenericId("ebookIssuances"),
});

export const sEbookDownloadDoc = sEbookDownloadFields.pipe(S.fieldsAssign(SystemFields.SystemFields("ebookDownloads").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookDownloadCreate = sEbookDownloadFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookDownloads = {
  Create: typeof sEbookDownloadCreate.Type;
  Doc: typeof sEbookDownloadDoc.Type;
  Fields: typeof sEbookDownloadFields.Type;
};
