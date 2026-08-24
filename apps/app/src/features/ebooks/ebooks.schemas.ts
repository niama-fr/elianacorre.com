import { MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { sTrimRequired } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// ISSUES ----------------------------------------------------------------------------------------------------------------------------------
export const EBOOK_CREATE_ISSUE = {
  fileInvalid: "EBOOK_CREATE_FILE_INVALID",
  fileSizeInvalid: "EBOOK_CREATE_FILE_SIZE_INVALID",
} as const;

// CREATE FORM -----------------------------------------------------------------------------------------------------------------------------
export const sEbookCreateForm = S.Struct({
  file: S.NullOr(
    S.instanceOf(File).check(
      S.makeFilter((file) => file.size <= MAX_SIZE, { message: EBOOK_CREATE_ISSUE.fileSizeInvalid }),
      S.makeFilter((file) => PDF_ACCEPTED_TYPES.some((type) => type === file.type), { message: EBOOK_CREATE_ISSUE.fileInvalid })
    )
  ).check(S.makeFilter((file): file is File => file !== null, { message: EBOOK_CREATE_ISSUE.fileInvalid })),
  title: sTrimRequired,
});
export type EbookCreateFormValues = typeof sEbookCreateForm.Encoded;
