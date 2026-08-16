import * as m from "@/paraglide/messages";

const validationMessages = {
  TRAVEL_PACK_SLUG_INVALID: m.cold_cats_live,
  TRAVEL_PACK_SLUG_REQUIRED: m.eighty_olives_visit,
  TRAVEL_PACK_TITLE_REQUIRED: m.wide_berries_stop,
  TRAVEL_PACK_YOUTUBE_URL_INVALID: m.funky_brooms_lay,
} satisfies Record<string, () => string>;

export function validationMessage(error: string) {
  const message = validationMessages[error as keyof typeof validationMessages];
  return message ? message() : error;
}
