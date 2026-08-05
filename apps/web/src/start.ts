import { resolveSecurityPolicyMode } from "@ec/http/security-policy";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { createSecurityMiddleware, isCsrfProtectedRequest } from "@/http/security-policy";

export const startInstance = createStart(() => {
  const securityPolicyMode = resolveSecurityPolicyMode(process.env.CSP_MODE);

  return {
    requestMiddleware: [createSecurityMiddleware(securityPolicyMode), createCsrfMiddleware({ filter: isCsrfProtectedRequest })],
  };
});
