import { IMAGE_ACCEPTED_TYPES, MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { zTravelPackUpdate, zTravelPackYoutubeUrl } from "@ec/domain/schemas/travel-packs";
import { z } from "zod";

import * as m from "@/paraglide/messages";

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackUpdateValues = zTravelPackUpdate
  .omit({ _id: true, coverFileName: true, coverStorageId: true, pdfFileName: true, pdfStorageId: true })
  .extend({
    cover: z
      .file()
      .max(MAX_SIZE, { error: m.fifty_hoops_show() })
      .mime([...IMAGE_ACCEPTED_TYPES], { error: m.spicy_brooms_rule() })
      .nullable(),
    pdf: z
      .file()
      .max(MAX_SIZE, { error: m.tiny_mugs_study() })
      .mime([...PDF_ACCEPTED_TYPES], { error: m.dull_things_work() })
      .nullable(),
    youtubeUrl: z
      .string()
      .transform((value) => value.trim() || null)
      .pipe(zTravelPackYoutubeUrl),
  });
export type TravelPackUpdateValues = z.input<typeof zTravelPackUpdateValues>;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackCreateValues = zTravelPackUpdateValues.pick({ title: true });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
