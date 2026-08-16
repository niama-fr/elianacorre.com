import { IMAGE_ACCEPTED_TYPES, MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import {
  zTravelPackDescription,
  zTravelPackDestination,
  zTravelPackExcerpt,
  zTravelPackSlugInput,
  zTravelPackTitle,
  zTravelPackYoutubeUrl,
} from "@ec/domain/schemas/travel-packs";
import { z } from "zod";

import * as m from "@/paraglide/messages";

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackUpdateValues = z.object({
  cover: z
    .file()
    .max(MAX_SIZE, { error: m.fifty_hoops_show() })
    .mime([...IMAGE_ACCEPTED_TYPES], { error: m.spicy_brooms_rule() })
    .nullable(),
  description: zTravelPackDescription,
  destination: zTravelPackDestination,
  excerpt: zTravelPackExcerpt,
  pdf: z
    .file()
    .max(MAX_SIZE, { error: m.tiny_mugs_study() })
    .mime([...PDF_ACCEPTED_TYPES], { error: m.dull_things_work() })
    .nullable(),
  slug: zTravelPackSlugInput,
  title: zTravelPackTitle,
  youtubeUrl: z
    .string()
    .transform((value) => value.trim() || null)
    .pipe(zTravelPackYoutubeUrl),
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackCreateValues = zTravelPackUpdateValues.pick({ title: true });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type TravelPackUpdateDefaultValues = z.input<typeof zTravelPackUpdateValues>;
