import { IMAGE_ACCEPTED_TYPES, MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import {
  sTravelPackDescription,
  sTravelPackDestination,
  sTravelPackExcerpt,
  sTravelPackSlug,
  sTravelPackTitle,
  sTravelPackYoutubeUrlFromForm,
  TRAVEL_PACK_ERROR,
} from "@ec/domain/schemas/travel-packs";
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

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackUpdateValues = S.Struct({
  cover: S.NullOr(fileWith(IMAGE_ACCEPTED_TYPES, TRAVEL_PACK_ERROR.coverMimeTypeInvalid, TRAVEL_PACK_ERROR.coverSizeInvalid)),
  description: sTravelPackDescription,
  destination: sTravelPackDestination,
  excerpt: sTravelPackExcerpt,
  pdf: S.NullOr(fileWith(PDF_ACCEPTED_TYPES, TRAVEL_PACK_ERROR.pdfMimeTypeInvalid, TRAVEL_PACK_ERROR.pdfSizeInvalid)),
  slug: sTravelPackSlug,
  title: sTravelPackTitle,
  youtubeUrl: sTravelPackYoutubeUrlFromForm,
});
export type TravelPackUpdateValues = typeof sTravelPackUpdateValues.Encoded;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackCreateValues = S.Struct({ title: sTravelPackTitle });

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackSearch = S.Struct({ create: S.optionalKey(S.Boolean) });
