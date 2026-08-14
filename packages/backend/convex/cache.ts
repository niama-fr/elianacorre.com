import { PRIVACY_NOTICE_REVALIDATION_PATH } from "@ec/http/cache-revalidation";
import { z } from "@ec/validation/zod";

import { env } from "./_generated/server";
import { zInternalAction } from "./zod";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zPublicSiteUrl = z
  .url()
  .transform((value) => new URL(value))
  .refine(({ hostname }) => !["localhost", "127.0.0.1", "::1"].includes(hostname));

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
export const revalidatePrivacyNotice = zInternalAction({
  args: {},
  handler: async () => {
    if (!zPublicSiteUrl.safeParse(env.SITE_URL).success) return;
    const secret = env.CACHE_REVALIDATION_SECRET;
    if (!secret) return { status: "skipped" as const };

    const response = await fetch(new URL(PRIVACY_NOTICE_REVALIDATION_PATH, env.SITE_URL).toString(), {
      headers: { Authorization: `Bearer ${secret}` },
      method: "POST",
    });
    if (!response.ok) throw new Error(`Privacy-notice cache revalidation failed with status ${response.status}`);

    return { status: "revalidated" as const };
  },
});
