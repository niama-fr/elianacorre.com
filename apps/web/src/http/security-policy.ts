import { HTTP_HEADER } from "@ec/http/headers";
import { createMiddleware } from "@tanstack/react-start";

// POLICY -------------------------------------------------------------------------------------------------------------------------------
export type SecurityPolicyMode = "enforce" | "report-only";

export const CLOUDFLARE_WEB_ANALYTICS_POLICY = "disabled" as const;

const PUBLIC_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https://ik.imagekit.io",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests",
].join("; ");

// Capability pages use the same deterministic policy as cached marketing HTML. Their private cache
// classification belongs to cache-policy.ts and must not change the security policy's interface.
const PUBLIC_CAPABILITY_CSP = PUBLIC_CSP;

const COMMON_SECURITY_HEADERS = {
  [HTTP_HEADER.permissionsPolicy]: "camera=(), geolocation=(), microphone=()",
  [HTTP_HEADER.referrerPolicy]: "strict-origin-when-cross-origin",
  [HTTP_HEADER.strictTransportSecurity]: "max-age=31536000; includeSubDomains",
  [HTTP_HEADER.xContentTypeOptions]: "nosniff",
  [HTTP_HEADER.xFrameOptions]: "DENY",
} as const;

export const SECURITY_HEADERS = {
  [HTTP_HEADER.contentSecurityPolicy]: PUBLIC_CSP,
  ...COMMON_SECURITY_HEADERS,
} as const;

const CAPABILITY_PATHS = new Set(["/newsletter/confirmation", "/newsletter/ebook"]);
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// HELPERS ------------------------------------------------------------------------------------------------------------------------------
export const resolveSecurityPolicyMode = (value?: string): SecurityPolicyMode => {
  if (value === undefined || value === "report-only") return "report-only";
  if (value === "enforce") return "enforce";

  throw new Error(`Unsupported CSP_MODE value: ${value}`);
};

export const isCsrfProtectedRequest = ({ handlerType, request }: { handlerType: "serverFn" | "router"; request: Request }): boolean =>
  handlerType === "serverFn" || STATE_CHANGING_METHODS.has(request.method);

// APPLY --------------------------------------------------------------------------------------------------------------------------------
export const applySecurityHeaders = (request: Request, response: Response, mode: SecurityPolicyMode = "report-only"): Response => {
  const headers = new Headers(response.headers);
  const pathname = normalizePathname(new URL(request.url).pathname);
  const contentSecurityPolicy = CAPABILITY_PATHS.has(pathname) ? PUBLIC_CAPABILITY_CSP : PUBLIC_CSP;

  for (const [name, value] of Object.entries(COMMON_SECURITY_HEADERS)) headers.set(name, value);

  headers.delete(HTTP_HEADER.contentSecurityPolicy);
  headers.delete(HTTP_HEADER.contentSecurityPolicyReportOnly);
  headers.set(mode === "enforce" ? HTTP_HEADER.contentSecurityPolicy : HTTP_HEADER.contentSecurityPolicyReportOnly, contentSecurityPolicy);

  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

export const createSecurityMiddleware = (mode: SecurityPolicyMode) =>
  createMiddleware().server(async ({ next, request }) => {
    // The middleware must inspect the downstream response before returning it.
    // oxlint-disable-next-line node/callback-return
    const result = await next();
    return { ...result, response: applySecurityHeaders(request, result.response, mode) };
  });

function normalizePathname(pathname: string): string {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/u, "");
}
