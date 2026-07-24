import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zEbookRecoveryRequestValues } from "@ec/domain/schemas/ebook-recoveries";
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

import { clientEnv } from "@/config/env";

// REQUEST EBOOK RECOVERY ------------------------------------------------------------------------------------------------------------------
export const requestEbookRecovery = createServerFn({ method: "POST" })
  .validator(zEbookRecoveryRequestValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.ebooks.requestRecovery, { ...data, requestIp: getRequestIP({ xForwardedFor: true }) ?? "unknown" });
  });
