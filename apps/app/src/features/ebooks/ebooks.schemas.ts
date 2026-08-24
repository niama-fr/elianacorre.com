import { MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { Schema as S, SchemaTransformation as ST } from "effect";

// ISSUES ----------------------------------------------------------------------------------------------------------------------------------
export const EBOOK_CREATE_ISSUE = {
  fileInvalid: "EBOOK_CREATE_FILE_INVALID",
  fileSizeInvalid: "EBOOK_CREATE_FILE_SIZE_INVALID",
  titleRequired: "EBOOK_CREATE_TITLE_REQUIRED",
} as const;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookCreate = S.toStandardSchemaV1(
  S.Struct({
    file: S.toStandardSchemaV1(
      S.NullOr(
        S.instanceOf(File).check(
          S.makeFilter((file) => file.size <= MAX_SIZE, { message: EBOOK_CREATE_ISSUE.fileSizeInvalid }),
          S.makeFilter((file) => PDF_ACCEPTED_TYPES.some((type) => type === file.type), { message: EBOOK_CREATE_ISSUE.fileInvalid })
        )
      ).check(S.makeFilter((file): file is File => file !== null, { message: EBOOK_CREATE_ISSUE.fileInvalid }))
    ),
    title: S.toStandardSchemaV1(S.String.pipe(S.decode(ST.trim())).check(S.isMinLength(1, { message: EBOOK_CREATE_ISSUE.titleRequired }))),
  })
);
export type EbookCreate = typeof sEbookCreate.Encoded;
