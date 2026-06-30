# Deployment

The React application in `apps/web` uses Convex for backend state and Cloudflare Workers for hosting. GitHub Actions coordinates both systems so a
Worker is never intentionally deployed against an unrelated Convex code version.

## Deployment topology

| Application environment | Convex target                                                     | Cloudflare target         | Trigger                  |
| ----------------------- | ----------------------------------------------------------------- | ------------------------- | ------------------------ |
| Local dev               | Personal dev deployment in `eliana-corre:elianacorre-com-staging` | Local Vite server         | `bun run dev`            |
| Staging                 | Production deployment in `eliana-corre:elianacorre-com-staging`   | `elianacorre-com-staging` | Every merge to `main`    |
| Production              | Production deployment in `eliana-corre:elianacorre-com-b1869`     | `elianacorre-com`         | Protected manual release |

The personal dev deployment in the production Convex project is unused. Pull requests do not create Convex deployments or Cloudflare versions.

`main` is the integration branch. A successful merge deploys to staging, where manual browser validation occurs. Production remains unchanged until
the latest successful staging commit is deliberately promoted.

## Environment isolation

Every Convex deployment owns separate data, files, functions, environment variables, Better Auth sessions, and scheduled jobs. Staging data is
disposable and must never be copied to production. Real identities, content, contacts, and future consent records remain authoritative only in the
production deployment.

Each deployment declares:

- `BETTER_AUTH_SECRET`: unique secret generated from at least 32 random bytes.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: non-production credentials for dev and staging; separate credentials for production.
- `SITE_URL`: exact application origin with no trailing path.
- `WHITELIST_SEED`: JSON array of initial Content Administrator email addresses.

The Google OAuth clients authorize these callbacks:

```text
http://localhost:3002/api/auth/callback/google
https://staging.elianacorre.com/api/auth/callback/google
https://elianacorre.com/api/auth/callback/google
```

Dev and staging use the first two callbacks on one non-production client. Production uses only the final callback on its production client.

## Local development

Local development uses the personal cloud dev deployment in the staging Convex project. Select it from `packages/backend`:

```bash
rtk proxy bunx convex deployment select eliana-corre:elianacorre-com-staging:dev
```

Configure that deployment's environment variables in Convex, set the generated `VITE_CONVEX_URL` for `apps/web`, then run:

```bash
rtk proxy bun run dev
```

The backend workspace runs `convex dev --run profiles:seed`. The idempotent internal mutation inserts missing administrators once when the dev
process starts and does not remove existing profiles.

## GitHub environments

### `staging`

Secrets:

- `CONVEX_DEPLOY_KEY`
- `CLOUDFLARE_API_TOKEN`

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `STAGING_URL`: `https://staging.elianacorre.com`

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
- `CONVEX_URL`: production `.convex.cloud` URL used to build Worker-only rollbacks.
- `PRODUCTION_URL`: use the production `workers.dev` URL before launch, then `https://elianacorre.com`.

The production environment is restricted to protected branches and requires Grégory's approval. Its Convex key has the same two minimal permissions
as staging.

Secrets never belong in Git, Linear, Obsidian, comments, command arguments, or prompts. Store them through GitHub or the Convex dashboard.

## Pull-request verification

`.github/workflows/pull-request.yml` runs four independent jobs:

- `Quality`
- `Typecheck`
- `Tests`
- `Build`

The `Protect main` ruleset requires those jobs and an up-to-date pull request. Grégory's manual merge is the human decision; no protected PR
environment approval or hosted preview is involved.

## Persistent staging

`.github/workflows/deploy-staging.yml` runs on every push to `main`:

1. Check out the exact merge commit.
2. Deploy functions and schema to the staging Convex project.
3. Build `apps/web` against the staging Convex URL.
4. Run the idempotent internal `profiles:seed` mutation.
5. Deploy `elianacorre-com-staging` with the merge SHA in Cloudflare metadata.

Attach `staging.elianacorre.com` to the staging Worker under **Workers & Pages → Settings → Domains & Routes**. Protect the hostname with Cloudflare
Access and allow only Grégory's email. Then set the fixed origins:

```bash
rtk gh variable set STAGING_URL --env staging --body "https://staging.elianacorre.com"
```

Set the staging Convex `SITE_URL` to the same origin and add its exact Google callback before verifying authentication.

## Production release

`.github/workflows/deploy-production.yml` accepts a stable SemVer without the `v` prefix and a release reason. It does not accept an arbitrary SHA.

1. Resolve the latest GitHub deployment of the `staging` environment that reached a successful status.
2. Require `1.0.0` for the first release and a stable version greater than every existing release thereafter.
3. Reject malformed versions and an existing `v<version>` tag before requesting protected approval.
4. After approval, check out the resolved staging SHA.
5. Deploy production Convex functions and schema, build the application against that deployment, and seed missing administrators.
6. Deploy the production Worker.
7. Create `v<version>` and a GitHub Release only after both deployments succeed.

Release notes include the reason, exact SHA, workflow link, and GitHub's generated list of merged pull requests. The first launch release is `v1.0.0`.

From GitHub Web, open **Actions → Deploy production → Run workflow**, enter a version such as `1.0.0` and the release reason, then approve the
protected `production` environment.

## Rollback

`.github/workflows/rollback-production.yml` is a separate protected manual workflow. It accepts an existing `v<version>` GitHub Release, scope, and
incident reason.

- `worker` is the default. It rebuilds the tagged application against `CONVEX_URL` and deploys only the production Worker.
- `worker-and-convex` also deploys the tagged Convex functions and schema. Use it only after explicitly verifying compatibility with current
  production data.

After stabilization, deliver the permanent correction through `main`, staging validation, and a new patch release. Never move or recreate a
published production tag.

## Convex migration rule

Convex schema and data changes use expand-and-contract releases:

1. Add backward-compatible fields, indexes, and functions.
2. Deploy and backfill data.
3. Move application reads and writes to the new shape.
4. Remove obsolete behavior only in a later production release.

This keeps the current and previous Worker compatible during deployment and makes Worker-only rollback viable. A production release must not combine
the first use of a replacement shape with removal of the old shape.

## Custom-domain launch

Moving `elianacorre.com` from the existing project is a separate manual launch operation:

1. Release and verify `v1.0.0` through the production `workers.dev` URL.
2. Configure production Convex `SITE_URL`, Google OAuth, and `PRODUCTION_URL` for the apex domain.
3. Detach the apex domain from the old Worker and attach it to `elianacorre-com`.
4. Configure a permanent `www.elianacorre.com` redirect to `https://elianacorre.com`.
5. Verify TLS, authentication, contact submission, canonical redirects, and rollback readiness.
6. Keep the old Worker available temporarily for emergency recovery.

Do not move the public domain as part of an ordinary staging or production workflow change.

## Retire preview infrastructure

After this workflow change is merged and its four PR checks are proven:

1. Delete expired Convex preview deployments from both projects.
2. Delete the unused Cloudflare Worker `elianacorre-com-preview`.
3. Delete the unused GitHub environments `preview` and `pull-request-approval` after confirming no workflow references them.
4. Revoke the Convex Preview Deploy Key and dedicated preview Cloudflare token.

## Human verification

After every merge, verify the staging Actions run and `https://staging.elianacorre.com`. Before production, confirm the exact staging commit was
reviewed. After release or rollback, verify the workflow summary, GitHub Release or rollback tag, Worker URL, authentication, and critical forms.
