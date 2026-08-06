import {
  applySecurityPolicy as applySecurityPolicy_,
  createContentSecurityPolicyNonce,
  serializeContentSecurityPolicy,
} from "@ec/http/security-policy";
import { createMiddleware } from "@tanstack/react-start";

import { publicEnv, getServerEnv } from "@/config/env";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const SECURITY_NONCE_CONTEXT_KEY = "securityNonce" as const;

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applySecurityPolicy = (response: Response, nonce?: string): Response => {
  const { CSP_MODE: mode } = getServerEnv();
  const convexHttpOrigin = new URL(publicEnv.VITE_CONVEX_URL).origin;
  const convexWebSocketUrl = new URL(convexHttpOrigin);
  convexWebSocketUrl.protocol = convexWebSocketUrl.protocol === "https:" ? "wss:" : "ws:";
  const nonceSource = nonce === undefined ? [] : [`'nonce-${nonce}'`];

  return applySecurityPolicy_(response, {
    contentSecurityPolicy: serializeContentSecurityPolicy({
      "base-uri": ["'none'"],
      "connect-src": ["'self'", convexHttpOrigin, convexWebSocketUrl.origin],
      "default-src": ["'self'"],
      "font-src": ["'self'", "data:"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "frame-src": ["'none'"],
      "img-src": ["'self'", "data:", "blob:", "https://ik.imagekit.io"],
      "manifest-src": ["'self'"],
      "media-src": ["'self'", "blob:"],
      "object-src": ["'none'"],
      "script-src": ["'self'", ...nonceSource],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", ...nonceSource],
      "style-src-attr": ["'unsafe-inline'"],
      "upgrade-insecure-requests": true,
      "worker-src": ["'self'", "blob:"],
    }),
    mode,
  });
};

// MIDDLEWARE ------------------------------------------------------------------------------------------------------------------------------
export const createSecurityMiddleware = () =>
  createMiddleware().server(async ({ next, handlerType }) => {
    const nonce = handlerType === "router" ? createContentSecurityPolicyNonce() : undefined;
    // The middleware must inspect the downstream response before returning it.
    // oxlint-disable-next-line node/callback-return
    const result = await next(nonce === undefined ? undefined : { context: { [SECURITY_NONCE_CONTEXT_KEY]: nonce } });
    return { ...result, response: applySecurityPolicy(result.response, nonce) };
  });
