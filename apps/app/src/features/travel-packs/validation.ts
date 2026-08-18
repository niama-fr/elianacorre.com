import { TRAVEL_PACK_ERROR, type TravelPacks } from "@ec/domain/schemas/travel-packs";

import * as m from "@/paraglide/messages";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const travelPacksValidation = {
  [TRAVEL_PACK_ERROR.coverInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.coverMimeTypeInvalid]: m.spicy_brooms_rule,
  [TRAVEL_PACK_ERROR.coverSizeInvalid]: m.fifty_hoops_show,
  [TRAVEL_PACK_ERROR.notEditable]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.unknown]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.pdfInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.pdfMimeTypeInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ERROR.pdfSizeInvalid]: m.tiny_mugs_study,
  [TRAVEL_PACK_ERROR.slugInvalid]: m.cold_cats_live,
  [TRAVEL_PACK_ERROR.slugRequired]: m.eighty_olives_visit,
  [TRAVEL_PACK_ERROR.titleRequired]: m.wide_berries_stop,
  [TRAVEL_PACK_ERROR.youtubeUrlInvalid]: m.funky_brooms_lay,
} satisfies Record<TravelPacks["Error"], () => string>;
