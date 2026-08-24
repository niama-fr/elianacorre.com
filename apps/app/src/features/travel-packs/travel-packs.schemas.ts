import { IMAGE_ACCEPTED_TYPES, MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { sTravelPackYoutubeUrlFromForm, TRAVEL_PACK_ISSUE } from "@ec/domain/schemas/travel-packs";
import { sSlug, sTrimRequired } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// Structural declaration accepts browser File values across test/browser realms.
const sBrowserFile = S.declare<File>(
  (input): input is File =>
    typeof input === "object" &&
    input !== null &&
    "name" in input &&
    typeof input.name === "string" &&
    "size" in input &&
    typeof input.size === "number" &&
    "type" in input &&
    typeof input.type === "string"
);

const fileWith = (acceptedTypes: readonly string[], mimeError: string, sizeError: string) =>
  sBrowserFile.check(
    S.makeFilter((file) => file.size <= MAX_SIZE || sizeError),
    S.makeFilter((file) => acceptedTypes.includes(file.type) || mimeError)
  );

// UPDATE FORM -----------------------------------------------------------------------------------------------------------------------------
export const sTravelPackUpdateForm = S.Struct({
  cover: S.NullOr(fileWith(IMAGE_ACCEPTED_TYPES, TRAVEL_PACK_ISSUE.coverMimeTypeInvalid, TRAVEL_PACK_ISSUE.coverSizeInvalid)),
  description: S.String,
  destination: S.Trim,
  excerpt: S.Trim,
  pdf: S.NullOr(fileWith(PDF_ACCEPTED_TYPES, TRAVEL_PACK_ISSUE.pdfMimeTypeInvalid, TRAVEL_PACK_ISSUE.pdfSizeInvalid)),
  slug: sSlug,
  title: sTrimRequired,
  youtubeUrl: sTravelPackYoutubeUrlFromForm,
});
export type TravelPackUpdateFormValues = typeof sTravelPackUpdateForm.Encoded;

// CREATE FORM -----------------------------------------------------------------------------------------------------------------------------
export const sTravelPackCreateForm = S.Struct({ title: sTrimRequired });

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackSearch = S.Struct({ create: S.optionalKey(S.Boolean) });
