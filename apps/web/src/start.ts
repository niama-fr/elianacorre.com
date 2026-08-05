import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { isCsrfProtectedRequest } from "@/http/security-policy";

// INSTANCE --------------------------------------------------------------------------------------------------------------------------------
export const startInstance = createStart(() => ({
  requestMiddleware: [createCsrfMiddleware({ filter: isCsrfProtectedRequest })],
}));
