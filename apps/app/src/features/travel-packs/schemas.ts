import { IMAGE_ACCEPTED_TYPES, MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { TRAVEL_PACK_ERROR, zTravelPackUpdate, zTravelPackYoutubeUrl } from "@ec/domain/schemas/travel-packs";
import { z } from "zod";

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackUpdateValues = zTravelPackUpdate
  .omit({ _id: true, coverFileName: true, coverStorageId: true, pdfFileName: true, pdfStorageId: true })
  .extend({
    cover: z
      .file()
      .max(MAX_SIZE, { error: TRAVEL_PACK_ERROR.coverSizeInvalid })
      .mime([...IMAGE_ACCEPTED_TYPES], { error: TRAVEL_PACK_ERROR.coverMimeTypeInvalid })
      .nullable(),
    pdf: z
      .file()
      .max(MAX_SIZE, { error: TRAVEL_PACK_ERROR.pdfSizeInvalid })
      .mime([...PDF_ACCEPTED_TYPES], { error: TRAVEL_PACK_ERROR.pdfMimeTypeInvalid })
      .nullable(),
    youtubeUrl: z
      .string()
      .transform((value) => value.trim() || null)
      .pipe(zTravelPackYoutubeUrl),
  });
export type TravelPackUpdateValues = z.input<typeof zTravelPackUpdateValues>;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackCreateValues = zTravelPackUpdateValues.pick({ title: true });
