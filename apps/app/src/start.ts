import { resolveSecurityPolicyMode } from "@ec/http/security-policy";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { clientEnv } from "@/config/env";
import { createSecurityMiddleware, isCsrfProtectedRequest } from "@/http/security-policy";

export const startInstance = createStart(() => {
  const securityPolicyMode = resolveSecurityPolicyMode(process.env.CSP_MODE);

  return {
    requestMiddleware: [
      createSecurityMiddleware({ convexUrl: clientEnv.VITE_CONVEX_URL, mode: securityPolicyMode }),
      createCsrfMiddleware({ filter: isCsrfProtectedRequest }),
    ],
  };
});
