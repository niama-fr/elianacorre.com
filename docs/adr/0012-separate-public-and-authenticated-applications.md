# Separate public and authenticated applications

## Status

Accepted.

## Context

The React application currently combines two workloads with opposing execution requirements.

The public website needs a small initial dependency graph, server-only reads from Convex, bounded ISR for cacheable marketing and legal content, and dynamic uncached handling for signed newsletter and e-book capabilities. It does not need Better Auth, TanStack Query, reactive Convex subscriptions, or authenticated SSR.

Administration and future member experiences need server authorization, authenticated Convex reads during SSR, hydrated TanStack Query state, live Convex subscriptions, mutations, and categorically private responses. Keeping both workloads in one TanStack Start application makes its root router, provider lifecycle, caching, security middleware, build graph, and deployment configuration responsible for unrelated concerns.

## Decision

Use two independently built and deployed TanStack Start applications:

- `apps/web` owns the public website at `elianacorre.com` and its staging equivalent at `staging.elianacorre.com`.
- `apps/app` owns login, Better Auth endpoints, administration, and future authenticated member experiences at `app.elianacorre.com` and `app.staging.elianacorre.com`.

`apps/web` reads public Convex data through server-only functions backed by the HTTP client. Its loaders call those server-only interfaces rather than importing a Convex client directly into isomorphic route code. It does not depend on Better Auth, TanStack Query, Convex React Query, or a reactive Convex provider.

`apps/app` owns the supported root-level Better Auth, TanStack Query, and Convex integration. It authorizes initial requests on the server, SSRs authenticated data where appropriate, and resumes live subscriptions in the browser after hydration.

Shared presentation, domain, and backend modules remain in workspace packages. Neither application imports source code from the other application. Public `/connexion` and `/admin/*` entry points redirect to the authenticated host during migration.

Staging, production release, rollback, verification, and local-development procedures treat the two applications as separately observable deployment artifacts built from the same reviewed commit. Production DNS cutover and protected deployment approval remain explicit human actions.

## Consequences

The public build is structurally isolated from authenticated and reactive client infrastructure. Public caching and security policy can be designed without branching around member responses, while the authenticated application can follow the maintained Convex SSR integration without special route-scoped provider lifecycle code.

The repository gains a second application build, Cloudflare Worker, hostname, staging target, environment configuration, OAuth callback, monitoring surface, and rollback artifact. CI and delivery documentation must verify both applications. Cross-application navigation performs a document navigation, and authentication cookies and redirects must be scoped deliberately to the authenticated host.

The split does not replace authorization. Protected Convex functions and authenticated application requests continue to enforce identity and role requirements on the server.

## Links

- [NIA-44](https://linear.app/niama/issue/NIA-44/split-public-and-authenticated-tanstack-applications)
- [NIA-45](https://linear.app/niama/issue/NIA-45/add-bounded-public-isr-and-private-application-cache-policies)
- [NIA-46](https://linear.app/niama/issue/NIA-46/enforce-application-specific-security-policies)
- [NIA-47](https://linear.app/niama/issue/NIA-47/enforce-independent-public-and-authenticated-delivery-budgets)
