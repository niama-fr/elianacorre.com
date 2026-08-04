// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https://ik.imagekit.io; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applySecurityHeaders = (res: Response): Response => {
  const headers = new Headers(res.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(res.body, { headers, status: res.status, statusText: res.statusText });
};
