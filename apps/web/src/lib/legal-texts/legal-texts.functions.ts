import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { createServerFn } from "@tanstack/react-start";

import { publicEnv } from "@/config/env";

export const requireActivePrivacyNotice = createServerFn({ method: "GET" }).handler(async () => {
  const convex = createConvexHttpClient(publicEnv.VITE_CONVEX_URL);
  return await convex.query(api.legalTexts.requireActivePrivacyNotice);
});
