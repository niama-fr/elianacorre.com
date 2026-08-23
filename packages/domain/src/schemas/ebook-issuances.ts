import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

import { sEbookDto } from "./ebooks";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sEbookIssuanceKind = S.Literals(["initial", "replacement"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookIssuanceFields = S.Struct({
  ebookId: GenericId.GenericId("ebooks"),
  kind: sEbookIssuanceKind,
  profileId: GenericId.GenericId("profiles"),
});

export const sEbookIssuanceDoc = sEbookIssuanceFields.pipe(S.fieldsAssign(SystemFields.SystemFields("ebookIssuances").fields));

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const sEbookIssuanceDto = sEbookIssuanceDoc.pipe(S.fieldsAssign({ ebook: sEbookDto }));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookIssuanceCreate = sEbookIssuanceFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookIssuances = {
  Create: typeof sEbookIssuanceCreate.Type;
  Doc: typeof sEbookIssuanceDoc.Type;
  Dto: typeof sEbookIssuanceDto.Type;
  Fields: typeof sEbookIssuanceFields.Type;
  Kind: typeof sEbookIssuanceKind.Type;
};
