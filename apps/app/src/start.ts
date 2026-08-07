import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { createSecurityMiddleware } from "@/http/security-policy";

// INSTANCE --------------------------------------------------------------------------------------------------------------------------------
export const startInstance = createStart(() => ({
  requestMiddleware: [createSecurityMiddleware(), createCsrfMiddleware({ filter: ({ handlerType }) => handlerType === "serverFn" })],
}));
