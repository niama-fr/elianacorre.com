import { applySecurityPolicy as applySecurityPolicy_, serializeContentSecurityPolicy } from "@ec/http/security-policy";

import { getServerEnv } from "@/config/env";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const CONTENT_SECURITY_POLICY = serializeContentSecurityPolicy({
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
  "worker-src": ["'self'", "blob:"],
});

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applySecurityPolicy = (response: Response): Response =>
  applySecurityPolicy_(response, { contentSecurityPolicy: CONTENT_SECURITY_POLICY, mode: getServerEnv().CSP_MODE });
