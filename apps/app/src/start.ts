import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { createSecurityMiddleware, isCsrfProtectedRequest, resolveSecurityPolicyMode } from "@/http/security-policy";

export const startInstance = createStart(() => {
  const securityPolicyMode = resolveSecurityPolicyMode(process.env.CSP_MODE);

  return {
    requestMiddleware: [createSecurityMiddleware(securityPolicyMode), createCsrfMiddleware({ filter: isCsrfProtectedRequest })],
  };
});
