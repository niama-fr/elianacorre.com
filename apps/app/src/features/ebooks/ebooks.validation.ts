import * as m from "@/paraglide/messages";

import { EBOOK_CREATE_ISSUE } from "./ebooks.schemas";

export const ebooksValidation = {
  [EBOOK_CREATE_ISSUE.fileInvalid]: m.dull_things_work,
  [EBOOK_CREATE_ISSUE.fileSizeInvalid]: m.tiny_mugs_study,
  [EBOOK_CREATE_ISSUE.titleRequired]: m.wide_berries_stop,
} as const;
