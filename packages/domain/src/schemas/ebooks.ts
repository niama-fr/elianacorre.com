import { GenericId, SystemFields } from "@confect/core";
import { Schema as S, Struct } from "effect";

import { sStrictNatural, sTrimRequired } from "./utils";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sProfileId = GenericId.GenericId("profiles");
const sStorageId = GenericId.GenericId("_storage");

const sEbookUrl = S.String.check(S.makeFilter((value) => URL.canParse(value)));

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookStatus = S.Literals(["archived", "draft", "published"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookFields = S.Struct({
  fileName: S.String,
  publishedAt: S.NullOr(S.Finite),
  publishedBy: S.NullOr(sProfileId),
  status: sEbookStatus,
  storageId: sStorageId,
  title: sTrimRequired,
  updatedAt: S.Finite,
  uploadedBy: sProfileId,
  version: sStrictNatural,
});

export const sEbookDoc = sEbookFields.pipe(S.fieldsAssign(SystemFields.SystemFields("ebooks").fields));

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const sEbookDto = sEbookDoc.mapFields(Struct.omit(["storageId"])).pipe(
  S.fieldsAssign({
    size: S.NullOr(S.Natural),
    url: S.NullOr(sEbookUrl),
  })
);

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const sEbook = sEbookDto;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookCreate = sEbookFields.mapFields(Struct.pick(["fileName", "storageId", "title"]));

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const sEbookPatch = S.Union([
  sEbookFields.mapFields(Struct.pick(["updatedAt"])).pipe(S.fieldsAssign({ status: S.Literal("archived") })),
  sEbookFields.mapFields(Struct.pick(["publishedAt", "publishedBy", "updatedAt"])).pipe(S.fieldsAssign({ status: S.Literal("published") })),
]);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Ebooks = {
  Create: typeof sEbookCreate.Type;
  Doc: typeof sEbookDoc.Type;
  Dto: typeof sEbookDto.Type;
  Entity: typeof sEbook.Type;
  Fields: typeof sEbookFields.Type;
  Patch: typeof sEbookPatch.Type;
  Status: typeof sEbookStatus.Type;
};
