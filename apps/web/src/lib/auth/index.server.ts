import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

import { clientEnv } from "@/config/env";

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } = convexBetterAuthReactStart({
  convexSiteUrl: clientEnv.VITE_CONVEX_SITE_URL,
  convexUrl: clientEnv.VITE_CONVEX_URL,
});
