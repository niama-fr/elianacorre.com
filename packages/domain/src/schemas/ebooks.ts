import { GenericId, SystemFields } from "@confect/core";
import { Schema as S, Struct } from "effect";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sProfileId = GenericId.GenericId("profiles");
const sStorageId = GenericId.GenericId("_storage");

const sEbookTitle = S.Trim.check(S.isMinLength(1));

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
  title: sEbookTitle,
  updatedAt: S.Finite,
  uploadedBy: sProfileId,
  version: S.Finite,
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

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Ebooks = {
  Create: typeof sEbookCreate.Type;
  Doc: typeof sEbookDoc.Type;
  Dto: typeof sEbookDto.Type;
  Entity: typeof sEbook.Type;
  Fields: typeof sEbookFields.Type;
  Status: typeof sEbookStatus.Type;
};
