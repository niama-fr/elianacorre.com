# Apply security policy per application

## Status

Accepted for implementation by NIA-46.

## Context

The public and authenticated TanStack Start applications have different execution and caching models. Public HTML may be reused by Cloudflare Workers Cache, so a per-response CSP nonce cannot be embedded in its cached document. The authenticated application is uncached and renders authenticated Convex state, Better Auth traffic, and live subscriptions, so it can use a fresh nonce for every SSR response.

One shared security middleware with application branches would make the public cache contract depend on authenticated capabilities and would reintroduce the cross-application coupling removed by NIA-44 and NIA-45.

## Decision

Each application owns its directives under `src/http/security-policy.ts`. The authenticated application registers its nonce-producing adapter as the first global TanStack Start request middleware because the nonce must exist before rendering. The public application applies its deterministic policy once at each Worker response entrypoint: the uncached gateway owns dynamic responses and `CachedApp` owns cacheable responses. Its TanStack middleware remains responsible only for CSRF. The policy-neutral `packages/http/src/security-policy.ts` module owns nonce generation, CSP serialization, deployment-mode validation, common headers, and immutable response reconstruction. It has no application switch, product origins, TanStack types, or cache classification.

The public application uses a deterministic CSP:

- `connect-src 'self'` prevents browser connections to authenticated Convex surfaces.
- `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'` preserve the existing TanStack hydration and deferred interaction behavior for reusable HTML.
- ImageKit is allowed for site images.
- Capability pages use the same deterministic CSP; `src/http/cache-policy.ts` remains the sole owner of their private cache classification.

The authenticated application generates 128 bits of Web Crypto randomness for each router response. Its middleware places the nonce in request context and the custom Start render callback applies it through `router.update({ ssr: ... })` before TanStack renders. TanStack then applies the same nonce to generated scripts and hydration metadata. Authenticated CSP allows same-origin scripts, the per-response nonce, Better Auth same-origin requests, and the exact configured Convex HTTP/WebSocket origins.

CSP is selected by the `CSP_MODE` Worker variable. Local and staging use `report-only`; protected production and rollback workflows explicitly use `enforce`. Cloudflare Web Analytics is disabled for both applications until a separate host-specific decision permits and validates its script and beacon origins.

CSRF middleware validates all server functions plus state-changing router requests. The public cache gateway forwards only known public HTML and discovery routes with no query string to `CachedApp`; response intent remains a second, independent requirement before storage. Public cache gateway and privacy revalidation handling remain in the custom public server entry; cache classification is not moved into the security modules.

## Consequences

Security decisions remain local to each application while shared HTTP mechanics are testable through one small response-policy interface. Public cached documents remain nonce-independent, while authenticated SSR receives a nonce without shared mutable state. Worker logs and sampled traces are enabled for operational evidence; browser CSP violations still require staging inspection or a separately approved reporting endpoint. A future Web Analytics decision must update both policy modules, the deployment mode documentation, and the host-specific staging evidence.

## Verification

Run focused policy tests, both application type checks, repository quality checks, and both production builds. On staging, inspect report-only headers and violations for marketing HTML, capability pages, authenticated SSR, server routes, server functions, redirects, errors, authentication, Convex subscriptions, forms, styles, and ImageKit images before using the protected production workflow.

## References

- [NIA-46](https://linear.app/niama/issue/NIA-46/enforce-application-specific-security-policies)
- [ADR 0011: Render published legal Markdown dynamically](0011-render-published-legal-markdown-dynamically.md)
- [ADR 0012: Separate public and authenticated applications](0012-separate-public-and-authenticated-applications.md)
