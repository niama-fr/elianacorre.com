import { HTTP_HEADER } from "@ec/http/headers";
import { createMiddleware } from "@tanstack/react-start";

// POLICY -------------------------------------------------------------------------------------------------------------------------------
export type SecurityPolicyMode = "enforce" | "report-only";

export const CLOUDFLARE_WEB_ANALYTICS_POLICY = "disabled" as const;
export const SECURITY_NONCE_CONTEXT_KEY = "securityNonce" as const;

const COMMON_SECURITY_HEADERS = {
  [HTTP_HEADER.permissionsPolicy]: "camera=(), geolocation=(), microphone=()",
  [HTTP_HEADER.referrerPolicy]: "strict-origin-when-cross-origin",
  [HTTP_HEADER.strictTransportSecurity]: "max-age=31536000; includeSubDomains",
  [HTTP_HEADER.xContentTypeOptions]: "nosniff",
  [HTTP_HEADER.xFrameOptions]: "DENY",
} as const;

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// HELPERS ------------------------------------------------------------------------------------------------------------------------------
export const resolveSecurityPolicyMode = (value: string | undefined): SecurityPolicyMode =>
  value === "enforce" ? "enforce" : "report-only";

export const createResponseNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCodePoint(...bytes));
};

export const isCsrfProtectedRequest = ({ handlerType, request }: { handlerType: "serverFn" | "router"; request: Request }): boolean =>
  handlerType === "serverFn" || STATE_CHANGING_METHODS.has(request.method);

export const getSecurityNonce = (context: unknown): string | undefined => {
  if (typeof context !== "object" || context === null || !(SECURITY_NONCE_CONTEXT_KEY in context)) return undefined;

  const nonce = context[SECURITY_NONCE_CONTEXT_KEY];
  return typeof nonce === "string" ? nonce : undefined;
};

// APPLY --------------------------------------------------------------------------------------------------------------------------------
export const applySecurityHeaders = (
  response: Response,
  { mode = "report-only", nonce }: { mode?: SecurityPolicyMode; nonce?: string } = {}
): Response => {
  const headers = new Headers(response.headers);
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);

  for (const [name, value] of Object.entries(COMMON_SECURITY_HEADERS)) headers.set(name, value);

  headers.delete(HTTP_HEADER.contentSecurityPolicy);
  headers.delete(HTTP_HEADER.contentSecurityPolicyReportOnly);
  headers.set(mode === "enforce" ? HTTP_HEADER.contentSecurityPolicy : HTTP_HEADER.contentSecurityPolicyReportOnly, contentSecurityPolicy);

  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

export const createSecurityMiddleware = (mode: SecurityPolicyMode) =>
  createMiddleware().server(async ({ next, handlerType }) => {
    const nonce = handlerType === "router" ? createResponseNonce() : undefined;
    // The middleware must inspect the downstream response before returning it.
    // oxlint-disable-next-line node/callback-return
    const result = nonce === undefined ? await next() : await next({ context: { [SECURITY_NONCE_CONTEXT_KEY]: nonce } });

    return { ...result, response: applySecurityHeaders(result.response, { mode, nonce }) };
  });

function createContentSecurityPolicy(nonce: string | undefined): string {
  const scriptSource = nonce === undefined ? "'self'" : `'self' 'nonce-${nonce}'`;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud wss://*.convex.site",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob: https://ik.imagekit.io",
    "object-src 'none'",
    `script-src ${scriptSource}`,
    "style-src 'self' 'unsafe-inline'",
    "upgrade-insecure-requests",
  ].join("; ");
}
