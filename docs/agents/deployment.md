# Deployment

The public application in `apps/web` and authenticated application in `apps/app` share one Convex backend and deploy as independent Cloudflare Workers. GitHub Actions builds both applications against the same Convex deployment and commit before deploying either Worker.

## Deployment topology

| Application environment | Convex target | Public target | Authenticated target | Trigger |
| --- | --- | --- | --- | --- |
| Local dev | Personal dev deployment in `eliana-corre:elianacorre-com-staging` | `localhost:3002` | `localhost:3003` | `bun run dev` |
| Staging | Production deployment in `eliana-corre:elianacorre-com-staging` | `elianacorre-com-staging` | `app-elianacorre-com-staging` | Every merge to `main` |
| Production | Production deployment in `eliana-corre:elianacorre-com-b1869` | `elianacorre-com` | `app-elianacorre-com` | Protected manual release |

The personal dev deployment in the production Convex project is unused. Pull requests do not create Convex deployments or Cloudflare versions.

`main` is the integration branch. A successful merge deploys to staging, where manual browser validation occurs. Production remains unchanged until the latest successful staging commit is deliberately promoted.

## Cloudflare response caching

### Worker TypeScript types

Generate Cloudflare runtime and configured binding types in each application with `bun run cf-typegen`. Commit the resulting `worker-configuration.d.ts` and rerun the command whenever Wrangler bindings, compatibility flags, or the compatibility date change. Do not add `@cloudflare/workers-types`; generated types match the deployed Worker configuration.

Wrangler intentionally cannot discover production secrets. Narrow secret bindings at runtime before use; never add their values to generated declarations or Wrangler variables.

The public Worker disables caching on its externally exposed default gateway and enables it only on the named `CachedApp` entrypoint in `apps/web/wrangler.jsonc`. The gateway runs before cache lookup and forwards only anonymous GET and HEAD requests without cookies, authorization, capability tokens, or newsletter capability paths through the cached loopback entrypoint. Anonymous successful HTML remains dynamic at build time because the root layout contains the current Convex privacy notice. The cached application sends browsers `Cache-Control: private, no-store` while `Cloudflare-CDN-Cache-Control` gives Cloudflare one hour of freshness and five minutes of stale-while-revalidate. The authenticated Worker sends both browser and Cloudflare `no-store` policies on every response. Requests carrying cookies or authorization, signed newsletter capability routes, redirects, errors, and responses with `Set-Cookie` are never shared.

TanStack routes declare public, discovery, or private cache intent using the protocol contracts in `packages/http/src/cache-policy.ts`. Application enforcement lives under each app's `src/http` folder; document metadata and search discovery live under `src/seo`. Request eligibility is checked by the uncached gateway and repeated by `CachedApp`'s response policy as defense in depth. `CachedApp` removes the internal intent header before responding and treats it only as permission to consider storage: status, response cookies, and content type still determine final eligibility. Missing intent is always private.

### NIA-46 security-policy follow-up

NIA-45 establishes the module boundaries but does not change the existing CSP contract. NIA-46 must complete these security-specific steps without moving cache classification back into security or SEO code:

1. Replace the inherited public policy in `apps/web/src/http/security-policy.ts` and create the authenticated application's policy under `apps/app/src/http`; each policy must be application-specific.
2. Register both policies through the supported TanStack Start middleware seam, while retaining the custom server entries until equivalent HTML, server-route, server-function, redirect, and error coverage is proven.
3. Keep cached public HTML compatible with deterministic CSP; give dynamic capability responses the policy required by their execution model.
4. Generate a cryptographically strong nonce per uncached authenticated response and propagate it to TanStack-generated scripts.
5. Register and test CSRF middleware for every state-changing same-origin server route and server function that requires it.
6. Prevent the public app from connecting to authenticated Convex surfaces while allowing the authenticated app's Better Auth and Convex traffic.
7. Decide Cloudflare Web Analytics independently for both hosts, deploy CSP in report-only mode, inspect violations, and obtain Grégory's approval before enforcement.

The public policy is deterministic so cached HTML can be reused: `connect-src` is limited to `'self'`, hydration and deferred interaction retain the required `'unsafe-inline'` script/style allowances, ImageKit remains allowed for images, and authenticated Convex origins are excluded. Capability pages use the same deterministic policy; their private cache classification remains in `src/http/cache-policy.ts`. The authenticated policy uses `script-src 'self' 'nonce-<per-response-value>'`, allows the authenticated Convex HTTP and WebSocket origins, and propagates the same nonce to TanStack-generated scripts through the custom Start render callback. Both applications keep styles compatible with existing UI behavior.

`CSP_MODE` is `report-only` for local and staging Workers. The staging workflow deploys both applications with `--var "CSP_MODE:report-only"`; the protected production and rollback workflows use `--var "CSP_MODE:enforce"` after staging reports have been reviewed and enforcement is approved. Cloudflare Web Analytics is deliberately disabled for both Workers: the policies do not allow `static.cloudflareinsights.com` or `cloudflareinsights.com`, and enabling it later requires an application-specific policy change plus host-by-host validation.

Security tests must cover representative cached public, capability, authenticated, redirect, error, and server-function responses. SEO modules must remain limited to document-head metadata and public discovery; neither CSP nor response cache directives belong there.

Shared public HTML is tagged `privacy-notice`. When the seed publishes changed privacy Markdown, Convex schedules `cache:revalidatePrivacyNotice`, which sends an authenticated `POST /_cache/revalidate/privacy-notice` to the environment's `SITE_URL`. The uncached gateway authenticates the request and calls `CachedApp`'s custom purge method; custom RPC bypasses cache lookup while purging the cached application's tagged responses. Failed or unconfigured invalidation never rolls back the immutable publication; one-hour freshness plus five-minute stale-while-revalidate remains the recovery bound.

Generate a different secret for each environment. In the Convex dashboard, select the environment's deployment and set `CACHE_REVALIDATION_SECRET` under **Settings → Environment Variables**. In Cloudflare, open the matching public Worker and add the same value under **Settings → Variables and Secrets → Secrets**. Never configure it on the authenticated Worker, expose it as a `VITE_` variable, paste it into commands, or commit it. To rotate it, update the public Worker first, immediately update the matching Convex deployment, then run `bunx convex run cache:revalidatePrivacyNotice` from `packages/backend` with that deployment selected. A successful result is `{ status: "revalidated" }`; restore the previous value on both systems if the check fails.

No dashboard Cache Rule should override these origin policies. In particular, do not configure an Edge TTL that ignores cache-control headers and do not strip `Set-Cookie`. After deploying staging, make two anonymous requests to the same public HTML URL and inspect `CF-Cache-Status`: the first should be `MISS` and the second `HIT`. Confirm the browser-facing `Cache-Control` remains `private, no-store`. Repeat with a cookie, a signed `/newsletter/confirmation` or `/newsletter/ebook` URL, and every authenticated-app response; each must report `BYPASS` and must not expose a shared freshness policy.

To verify expiry, stale revalidation, and legal publication, first record the active notice rendered by `/confidentialite` and the response's `Age`, then publish a changed staging notice. Keep requesting the same anonymous URL without cookies. Until `Age` reaches 3600 seconds, the old notice may remain a `HIT`. The first request after expiry should return the old notice with `CF-Cache-Status: UPDATING` while Cloudflare refreshes it in the background. Record that response, then continue polling: the changed notice must appear as a fresh `HIT` within the five-minute stale window, making the nominal healthy-origin publication bound 65 minutes. Restore approved staging content through the normal seed workflow after the test.

If private data appears in a cached response or a public response remains stale beyond 65 minutes, disable Workers Cache for the affected Worker in **Workers & Pages → Settings → Cache**, then use the Worker's own cache controls to purge its cached responses. Zone-level dashboard purges do not affect Workers Cache. Keep the authenticated Worker uncached, inspect the response headers and request cookie/capability exclusions, deploy a correction through `main`, and repeat the staging evidence before re-enabling public caching. Purging or changing production caching requires Grégory's explicit approval. Update this section whenever cache eligibility, TTLs, shared layout data, or the Cloudflare cache interface changes.

## Environment isolation

Every Convex deployment owns separate data, files, functions, environment variables, Better Auth sessions, and scheduled jobs. Staging data is disposable and must never be copied to production. Real identities, content, contacts, and future consent records remain authoritative only in the production deployment.

Each deployment declares:

- `BETTER_AUTH_SECRET`: unique secret generated from at least 32 random bytes.
- `CACHE_REVALIDATION_SECRET`: one environment-specific secret, generated from at least 32 random bytes and configured identically in the Convex deployment and its matching public Worker; authenticates privacy-notice cache invalidation.
- `CAPABILITY_SIGNING_SECRET`: unique secret generated from at least 32 random bytes; signs short-lived newsletter confirmation and e-book download URLs.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: non-production credentials for dev and staging; separate credentials for production.
- `LOOPS_API_KEY`, `LOOPS_CONFIRMATION_TRANSACTIONAL_ID`, and `LOOPS_EBOOK_TRANSACTIONAL_ID`: environment-specific Loops credentials and published transactional email identifiers.
- `LOOPS_WEBHOOK_SECRET`: the environment-specific signing secret shown when configuring the Loops webhook endpoint.
- `SITE_URL`: exact public application origin with no trailing path; owns public capability and newsletter links.
- `APP_SITE_URL`: exact authenticated application origin with no trailing path; owns Better Auth callbacks and trusted-origin checks.
- `SUPPRESSION_HASH_SECRET`: unique secret generated from at least 32 random bytes; creates the irreversible suppression lookup value.
- `WHITELIST_SEED`: JSON array of initial Content Administrator email addresses.

Development and staging use only the separate Loops staging environment. Production uses only the Loops production environment. There is no application-level recipient allowlist; the sole operator uses personal addresses for non-production tests.

The Google OAuth clients authorize these callbacks:

```text
http://localhost:3003/api/auth/callback/google
https://app.staging.elianacorre.com/api/auth/callback/google
https://app.elianacorre.com/api/auth/callback/google
```

Dev and staging use the first two callbacks on one non-production client. Production uses only the final callback on its production client.

## Local development

Local development uses the personal cloud dev deployment in the staging Convex project. Configure it once from `packages/backend`:

```bash
rtk proxy bunx convex dev --configure existing \
  --team eliana-corre \
  --project elianacorre-com-staging \
  --dev-deployment cloud \
  --once
```

Set the two local origins from `packages/backend`:

```bash
rtk proxy bunx convex env set SITE_URL http://localhost:3002
rtk proxy bunx convex env set APP_SITE_URL http://localhost:3003
```

Put the generated `VITE_CONVEX_URL` in both `apps/web/.env.local` and `apps/app/.env.local`. If the deployment does not use a `convex.cloud` URL, also set `VITE_CONVEX_SITE_URL` in `apps/app/.env.local`. Add `http://localhost:3003/api/auth/callback/google` to the non-production Google OAuth client, then run:

```bash
rtk proxy bun run dev
```

The backend workspace runs `convex dev --run seed:init`. The idempotent internal mutation inserts missing administrators and publishes changed canonical legal-text versions when the dev process starts. It does not remove existing profiles or legal-text versions.

## GitHub environments

### `staging`

Secrets:

- `CONVEX_DEPLOY_KEY`
- `CLOUDFLARE_API_TOKEN`

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `STAGING_URL`: `https://staging.elianacorre.com`
- `APP_STAGING_URL`: `https://app.staging.elianacorre.com`

The Convex key targets the production deployment of `elianacorre-com-staging` and grants only:

```text
deployment:deploy
deployment:functions:runInternalMutations
```

### `production`

Secrets:

- `CONVEX_DEPLOY_KEY`
- `CLOUDFLARE_API_TOKEN`

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CONVEX_URL`: production `.convex.cloud` URL used to build Workers-only rollbacks.
- `PRODUCTION_URL`: use the production `workers.dev` URL before launch, then `https://elianacorre.com`.
- `APP_PRODUCTION_URL`: use the authenticated production `workers.dev` URL before launch, then `https://app.elianacorre.com`.

The production environment is restricted to protected branches and requires Grégory's approval. Its Convex key has the same two minimal permissions as staging.

Secrets never belong in Git, Linear, Obsidian, comments, command arguments, or prompts. Store them through GitHub or the Convex dashboard.

## Loops webhooks

Loops currently supports one webhook endpoint per Loops account. If dev, staging, and production share one Loops account, configure the continuous webhook endpoint for production only and validate non-production deployments with signed fixtures or a temporary endpoint switch. Use separate Loops accounts/workspaces when multiple environments need live webhook delivery at the same time.

Configure the selected Loops account under **Settings → Webhooks** with its matching Convex HTTP URL:

```text
https://<deployment>.convex.site/loops/webhook
```

Enable `email.hardBounced`, `email.resubscribed`, `email.spamReported`, and `email.unsubscribed`. Copy the generated signing secret directly into that deployment's `LOOPS_WEBHOOK_SECRET` environment variable; never paste it into source control, task comments, or command arguments. Replay signed non-production fixtures for the enabled events. Loops' `testing.testEvent` is intentionally unsupported and returns HTTP 400; authentic enabled events return HTTP 204, missing or invalid signatures return 401, and malformed or unsupported payloads return 400.

### Temporary non-production endpoint switch

Use this only when a non-production deployment must receive a real Loops event. Grégory must approve the temporary interruption to production delivery.

1. In Loops **Settings → Webhooks**, record the current production URL without copying the signing secret anywhere new.
2. Confirm the target non-production Convex deployment already has the matching `LOOPS_WEBHOOK_SECRET` set through the Convex dashboard.
3. Replace the endpoint URL with `https://<non-production-deployment>.convex.site/loops/webhook`, enable only the four events above, and wait for Loops to apply the change.
4. Send an event to an allowlisted non-production address and confirm its webhook receipt, newsletter state, and Loops reconciliation in that deployment.
5. Restore the recorded production URL immediately. Confirm that Loops shows the production URL and the endpoint is enabled again.

If the test fails or is interrupted, restore the production URL first. Loops retains webhook history for 30 days; after restoration, use that history to retry a missed production event. Never change or expose the signing secret merely to switch URLs.

For every campaign and workflow, preview Loops' automatic footer and verify that its visible unsubscribe link reads **« Se désabonner »** and completes without an Account or a second confirmation. This wording is provider configuration, not application source code.

Convex stores `Webhook-Id` for idempotency. A permanent bounce or complaint suppresses campaign delivery without changing historical consent; unsubscribe ends the current consent period without deleting e-book grants. An authenticated preference-center resubscription creates a new consent period using the exact published privacy notice applicable at the event timestamp and records `loops` as durable confirmation evidence in `confirmedFrom`. An active bounce or complaint restriction remains in force and causes Convex to project the contact back to unsubscribed. The application queues the corresponding Loops contact reconciliation so Convex remains authoritative. To recover from a wrong secret, replace only the affected deployment's `LOOPS_WEBHOOK_SECRET` and resend the event from Loops' webhook history. If the endpoint URL is wrong, correct it in Loops and use the same history view to retry. Loops retains webhook history for 30 days.

Update this section whenever enabled events, the endpoint path, signature contract, or recovery procedure changes.

The complete manual email-operations procedure, including credentials, DNS, campaigns, alerts, replay, reconciliation, incidents, and legal-text publication, is [`docs/agents/newsletter-email-operations.md`](newsletter-email-operations.md).

## Pull-request verification

`.github/workflows/pull-request.yml` runs four independent jobs:

- `Quality`
- `Typecheck`
- `Tests`
- `Build`

The `Protect main` ruleset requires those jobs and an up-to-date pull request. Grégory's manual merge is the human decision; no protected PR environment approval or hosted preview is involved.

## Persistent staging

`.github/workflows/deploy-staging.yml` runs on every push to `main`:

1. Check out the exact merge commit.
2. Deploy functions and schema to the staging Convex project.
3. Build `apps/web` and `apps/app` against the staging Convex URL.
4. Run the idempotent internal `seed:init` mutation.
5. Deploy `elianacorre-com-staging` and `app-elianacorre-com-staging` with the merge SHA in Cloudflare metadata.

Attach `staging.elianacorre.com` to `elianacorre-com-staging` and `app.staging.elianacorre.com` to `app-elianacorre-com-staging` under **Workers & Pages → Settings → Domains & Routes**. Protect both hostnames with Cloudflare Access and allow only Grégory's email. Then set the fixed origins:

```bash
rtk gh variable set STAGING_URL --env staging --body "https://staging.elianacorre.com"
rtk gh variable set APP_STAGING_URL --env staging --body "https://app.staging.elianacorre.com"
```

Set the staging Convex `SITE_URL` to the public staging origin and `APP_SITE_URL` to the authenticated staging origin. Add the exact authenticated origin's Google callback before verifying authentication.

In the Convex dashboard, select the production deployment of `elianacorre-com-staging`, open **Settings → Environment Variables**, and set:

```text
SITE_URL=https://staging.elianacorre.com
APP_SITE_URL=https://app.staging.elianacorre.com
```

In Google Cloud Console, add `https://app.staging.elianacorre.com/api/auth/callback/google` to the non-production OAuth client's authorized redirect URIs. After both Workers and hostnames are available, verify public navigation and forms on the public host; then verify sign-in, authenticated SSR, client navigation, refresh, mutations, sign-out, and expired-session redirection on the authenticated host. Confirm that `POST /api/auth/sign-out` accepts the authenticated host's `Origin` and clears the Better Auth cookies.

## Production release

`.github/workflows/deploy-production.yml` accepts a stable SemVer without the `v` prefix and a release reason. It does not accept an arbitrary SHA.

1. Resolve the latest GitHub deployment of the `staging` environment that reached a successful status.
2. Require `1.0.0` for the first release and a stable version greater than every existing release thereafter.
3. Reject malformed versions and an existing `v<version>` tag before requesting protected approval.
4. After approval, check out the resolved staging SHA.
5. Deploy production Convex functions and schema, build both applications against that deployment, and seed missing administrators.
6. Deploy both production Workers.
7. Create `v<version>` and a GitHub Release only after Convex and both Worker deployments succeed.

Release notes include the reason, exact SHA, workflow link, and GitHub's generated list of merged pull requests. The first launch release is `v1.0.0`.

From GitHub Web, open **Actions → Deploy production → Run workflow**, select `main`, enter a version such as `1.0.0` and the release reason, then approve the protected `production` environment.

## Rollback

`.github/workflows/rollback-production.yml` is a separate protected manual workflow. It accepts an existing `v<version>` GitHub Release, scope, and incident reason.

- `workers` is the default. It rebuilds both tagged applications against `CONVEX_URL` and deploys both production Workers.
- `workers-and-convex` also deploys the tagged Convex functions and schema. Use it only after explicitly verifying compatibility with current production data.

Both Workers roll back to the same release commit; the workflow intentionally does not offer a one-Worker rollback. After stabilization, deliver the permanent correction through `main`, staging validation, and a new patch release. Never move or recreate a published production tag.

## Interrupted two-Worker deployment

Worker deployments are sequential rather than transactional. GitHub does not mark the environment deployment successful until Convex and both Workers finish, but cancellation or failure after the public Worker deploys can temporarily leave the two hosts on different commits.

Recover in this order:

1. Open the failed GitHub Actions run and confirm the deployed SHA in the public and authenticated Worker steps. Do not approve production or report staging as verified while the SHAs differ.
2. If the intended commit remains safe, rerun the failed workflow. It rebuilds and redeploys both Workers from the same checked-out SHA.
3. If the intended commit must be abandoned in production, dispatch **Roll back production** for the last known-good release with the default `workers` scope. This rebuilds and deploys both Workers from that release tag.
4. If staging cannot be rerun, open each Worker in **Cloudflare → Deployments**, identify the last version tag shared by both Workers, and roll the newer Worker back to that shared tag. Then rerun staging from a new merge before validation.
5. Confirm both Workers show the same commit tag and both canonical hosts respond before resuming delivery.

If Convex deployment completed before the interruption, prefer completing both Worker deployments when the change is backward compatible. Use `workers-and-convex` only after explicitly verifying that the tagged Convex code remains compatible with current production data.

## Convex migration rule

Convex schema and data changes use expand-and-contract releases:

1. Add backward-compatible fields, indexes, and functions.
2. Deploy and backfill data.
3. Move application reads and writes to the new shape.
4. Remove obsolete behavior only in a later production release.

This keeps the current and previous Workers compatible during deployment and makes Workers-only rollback viable. A production release must not combine the first use of a replacement shape with removal of the old shape.

## Custom-domain launch

Moving `elianacorre.com` from the existing project is a separate manual launch operation:

1. Release and verify `v1.0.0` through both production `workers.dev` URLs.
2. Configure production Convex `SITE_URL` for the apex domain, `APP_SITE_URL` for the authenticated hostname, Google OAuth for the authenticated callback, and both GitHub production URL variables.
3. Detach the apex domain from the old Worker and attach it to `elianacorre-com`.
4. Attach `app.elianacorre.com` to `app-elianacorre-com`.
5. Configure a permanent `www.elianacorre.com` redirect to `https://elianacorre.com`.
6. Verify TLS, authentication, contact submission, canonical redirects, and rollback readiness on both hosts.
7. Keep the old Worker available temporarily for emergency recovery.

Do not move the public domain as part of an ordinary staging or production workflow change.

For production, select the production deployment of `elianacorre-com-b1869` in the Convex dashboard and set `SITE_URL` to `https://elianacorre.com` and `APP_SITE_URL` to `https://app.elianacorre.com`. In the production Google OAuth client, authorize only `https://app.elianacorre.com/api/auth/callback/google`. Confirm both values before approving the protected production deployment.

To recover from an incorrect authenticated origin, restore the previous `APP_SITE_URL` in the affected Convex deployment and restore the corresponding Google OAuth redirect URI. Redeploy the backend functions, then repeat sign-in and sign-out verification. Never put OAuth credentials or Better Auth secrets in repository files or command arguments.

## Human verification

After every merge, verify the staging Actions run and both staging hosts. Before production, confirm the exact staging commit was reviewed. After release or rollback, verify the workflow summary, GitHub Release or rollback tag, both Worker URLs, authentication, and critical forms.
