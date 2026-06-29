import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

// CONFIG ----------------------------------------------------------------------------------------------------------------------------------
export default { providers: [getAuthConfigProvider()] } satisfies AuthConfig;
