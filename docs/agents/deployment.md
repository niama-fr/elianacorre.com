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

## Environment isolation

Every Convex deployment owns separate data, files, functions, environment variables, Better Auth sessions, and scheduled jobs. Staging data is disposable and must never be copied to production. Real identities, content, contacts, and future consent records remain authoritative only in the production deployment.

Each deployment declares:

- `BETTER_AUTH_SECRET`: unique secret generated from at least 32 random bytes.
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
