import { HTTP_HEADER } from "./headers";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const COMMON_SECURITY_HEADERS = {
  [HTTP_HEADER.permissionsPolicy]: "camera=(), geolocation=(), microphone=()",
  [HTTP_HEADER.referrerPolicy]: "strict-origin-when-cross-origin",
  [HTTP_HEADER.strictTransportSecurity]: "max-age=31536000; includeSubDomains",
  [HTTP_HEADER.xContentTypeOptions]: "nosniff",
  [HTTP_HEADER.xFrameOptions]: "DENY",
} as const;

const CONTENT_SECURITY_POLICY_NONCE_BYTE_LENGTH = 16;

// RESOLVE MODE ----------------------------------------------------------------------------------------------------------------------------
export const createContentSecurityPolicyNonce = (): string => {
  const bytes = new Uint8Array(CONTENT_SECURITY_POLICY_NONCE_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCodePoint(...bytes));
};

export const serializeContentSecurityPolicy = (directives: Readonly<Record<string, readonly string[] | true>>): string =>
  Object.entries(directives)
    .map(([directive, values]) => (values === true ? directive : `${directive} ${values.join(" ")}`))
    .join("; ");

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applySecurityPolicy = (
  response: Response,
  { contentSecurityPolicy, mode = "report-only" }: { contentSecurityPolicy?: string; mode?: SecurityPolicyMode } = {}
): Response => {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(COMMON_SECURITY_HEADERS)) headers.set(name, value);

  headers.delete(HTTP_HEADER.contentSecurityPolicy);
  headers.delete(HTTP_HEADER.contentSecurityPolicyReportOnly);
  if (contentSecurityPolicy)
    headers.set(
      mode === "enforce" ? HTTP_HEADER.contentSecurityPolicy : HTTP_HEADER.contentSecurityPolicyReportOnly,
      contentSecurityPolicy
    );

  try {
    response.headers.delete(HTTP_HEADER.contentSecurityPolicy);
    response.headers.delete(HTTP_HEADER.contentSecurityPolicyReportOnly);
    for (const [name, value] of headers) response.headers.set(name, value);
    return response;
  } catch {
    return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
  }
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type SecurityPolicyMode = "enforce" | "report-only";
