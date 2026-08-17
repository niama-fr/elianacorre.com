import { TRAVEL_PACK_ERROR, type TravelPacks } from "@ec/domain/schemas/travel-packs";

import * as m from "@/paraglide/messages";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const INTERNAL_ERROR_PATTERN = /^[A-Z][A-Z0-9_]+$/u;

const validationMessages = {
  [TRAVEL_PACK_ERROR.coverInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.notEditable]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.updateInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.createFailed]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.unknown]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.slugTaken]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.pdfInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.slugInvalid]: m.cold_cats_live,
  [TRAVEL_PACK_ERROR.slugRequired]: m.eighty_olives_visit,
  [TRAVEL_PACK_ERROR.titleRequired]: m.wide_berries_stop,
  [TRAVEL_PACK_ERROR.youtubeUrlInvalid]: m.funky_brooms_lay,
} satisfies Record<TravelPacks["Error"], () => string>;

export function validationMessage(error: string) {
  const message = validationMessages[error as keyof typeof validationMessages];
  if (message) return message();
  return INTERNAL_ERROR_PATTERN.test(error) ? m.plain_apples_rest() : error;
}
