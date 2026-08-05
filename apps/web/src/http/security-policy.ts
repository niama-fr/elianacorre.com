import { applySecurityPolicy, serializeContentSecurityPolicy, type SecurityPolicyMode } from "@ec/http/security-policy";

export { isCsrfProtectedRequest } from "@ec/http/security-policy";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const CLOUDFLARE_WEB_ANALYTICS_POLICY = "disabled" as const;

export const WEB_CONTENT_SECURITY_POLICY = serializeContentSecurityPolicy({
  "base-uri": ["'none'"],
  "connect-src": ["'self'"],
  "default-src": ["'self'"],
  "font-src": ["'self'", "data:"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "frame-src": ["'none'"],
  "img-src": ["'self'", "data:", "blob:", "https://ik.imagekit.io"],
  "manifest-src": ["'self'"],
  "media-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "script-src": ["'self'", "'unsafe-inline'"],
  "script-src-attr": ["'none'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "style-src-attr": ["'unsafe-inline'"],
  "upgrade-insecure-requests": true,
  "worker-src": ["'self'", "blob:"],
});

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applyWebSecurityPolicy = (response: Response, mode: SecurityPolicyMode = "report-only"): Response =>
  applySecurityPolicy(response, { contentSecurityPolicy: WEB_CONTENT_SECURITY_POLICY, mode });
