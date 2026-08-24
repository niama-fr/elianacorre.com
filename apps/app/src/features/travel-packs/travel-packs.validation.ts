import { TRAVEL_PACK_ISSUE, type TravelPacks } from "@ec/domain/schemas/travel-packs";

import * as m from "@/paraglide/messages";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const travelPacksValidation = {
  [TRAVEL_PACK_ISSUE.coverInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ISSUE.coverMimeTypeInvalid]: m.spicy_brooms_rule,
  [TRAVEL_PACK_ISSUE.coverSizeInvalid]: m.fifty_hoops_show,
  [TRAVEL_PACK_ISSUE.notEditable]: m.dull_things_work,
  [TRAVEL_PACK_ISSUE.unknown]: m.dull_things_work,
  [TRAVEL_PACK_ISSUE.pdfInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ISSUE.pdfMimeTypeInvalid]: m.dull_things_work,
  [TRAVEL_PACK_ISSUE.pdfSizeInvalid]: m.tiny_mugs_study,
  [TRAVEL_PACK_ISSUE.youtubeUrlInvalid]: m.funky_brooms_lay,
} satisfies Record<TravelPacks["Issue"], () => string>;
