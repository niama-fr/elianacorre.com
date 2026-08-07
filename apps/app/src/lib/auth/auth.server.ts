import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

import { publicEnv } from "@/config/env";

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } = convexBetterAuthReactStart({
  convexSiteUrl: publicEnv.VITE_CONVEX_SITE_URL,
  convexUrl: publicEnv.VITE_CONVEX_URL,
});
