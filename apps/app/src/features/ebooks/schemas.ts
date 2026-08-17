import { MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { z } from "@ec/validation/zod";

import { m } from "@/paraglide/messages";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookCreateValues = z.object({
  file: z
    .file({ error: m.dull_things_work() })
    .max(MAX_SIZE, { error: m.tiny_mugs_study() })
    .mime([...PDF_ACCEPTED_TYPES], { error: m.dull_things_work() })
    .nullable()
    .refine((file) => file !== null, { error: m.dull_things_work() }),
  title: z.string().trim().min(1, { error: m.wide_berries_stop() }),
});
export type EbookCreateValues = z.input<typeof zEbookCreateValues>;
