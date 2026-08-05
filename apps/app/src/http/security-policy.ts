import {
  applySecurityPolicy,
  createContentSecurityPolicyNonce,
  serializeContentSecurityPolicy,
  type SecurityPolicyMode,
} from "@ec/http/security-policy";
import { createMiddleware } from "@tanstack/react-start";

export { isCsrfProtectedRequest } from "@ec/http/security-policy";

export const CLOUDFLARE_WEB_ANALYTICS_POLICY = "disabled" as const;
export const SECURITY_NONCE_CONTEXT_KEY = "securityNonce" as const;

export const getSecurityNonce = (context: unknown): string | undefined => {
  if (typeof context !== "object" || context === null || !(SECURITY_NONCE_CONTEXT_KEY in context)) return undefined;

  const nonce = context[SECURITY_NONCE_CONTEXT_KEY];
  return typeof nonce === "string" ? nonce : undefined;
};

export const createAppContentSecurityPolicy = ({ convexUrl, nonce }: { convexUrl: string; nonce?: string }): string => {
  const convexHttpOrigin = new URL(convexUrl).origin;
  const convexWebSocketUrl = new URL(convexHttpOrigin);
  convexWebSocketUrl.protocol = convexWebSocketUrl.protocol === "https:" ? "wss:" : "ws:";
  const nonceSource = nonce ? [`'nonce-${nonce}'`] : [];

  return serializeContentSecurityPolicy({
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
  });
};

export const createSecurityMiddleware = ({ convexUrl, mode }: { convexUrl: string; mode: SecurityPolicyMode }) =>
  createMiddleware().server(async ({ next, handlerType }) => {
    const nonce = handlerType === "router" ? createContentSecurityPolicyNonce() : undefined;
    // The middleware must inspect the downstream response before returning it.
    // oxlint-disable-next-line node/callback-return
    const result = nonce === undefined ? await next() : await next({ context: { [SECURITY_NONCE_CONTEXT_KEY]: nonce } });

    return {
      ...result,
      response: applySecurityPolicy(result.response, {
        contentSecurityPolicy: createAppContentSecurityPolicy({ convexUrl, nonce }),
        mode,
      }),
    };
  });
