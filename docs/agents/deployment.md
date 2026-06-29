# Deployment

The stable application (`apps/web`) uses Convex for data and Cloudflare Workers for hosting. Delivery has three deliberately separate targets.

## Deployment topology

| Target               | Convex                                     | Cloudflare Worker                              | Trigger                                                     |
| -------------------- | ------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------- |
| Pull-request preview | Temporary preview deployment `pr-<number>` | `elianacorre-com-preview`, alias `pr-<number>` | Quality checks pass                                         |
| Persistent staging   | Separate Convex staging project            | `elianacorre-com-staging`                      | Approved pull request merges to `main`                      |
| Production release   | Production deployment                      | `elianacorre-com`                              | Manual workflow dispatch and protected environment approval |

`elianacorre.com` remains on the existing public site until a dedicated client-approved launch issue attaches it to `elianacorre-com`. A successful staging deployment is not a production release.

## Security boundaries

- Preview, staging, and production use separate GitHub environments.
- Preview uses a Convex Preview Deploy Key.
- Staging uses a production deploy key from a separate Convex staging project.
- Production uses the production deploy key from the real production project.
- Each environment has its own Cloudflare API token.
- Secret values never belong in Git, Linear, Obsidian, comments, terminal arguments, or prompts.

Cloudflare Workers Scripts permission is account-wide. Separate tokens isolate rotation and revocation but not Worker-level access. Strict Cloudflare-side isolation requires separate accounts.

## GitHub environments

### `preview`

Secrets:

- `CONVEX_DEPLOY_KEY`
- `CLOUDFLARE_API_TOKEN`

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_WORKERS_SUBDOMAIN`

No required reviewer. Pull-request code reaches this environment only after all quality checks pass.

### `staging`

Secrets:

- `CONVEX_DEPLOY_KEY`: production deploy key for the separate Convex staging project.
- `CLOUDFLARE_API_TOKEN`: dedicated staging Cloudflare token.

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `STAGING_URL`: `https://elianacorre-com-staging.<subdomain>.workers.dev`

No required reviewer. Only pushes to protected `main` trigger staging.

### `production`

Secrets:

- `CONVEX_DEPLOY_KEY`: production deploy key for the real production project.
- `CLOUDFLARE_API_TOKEN`: dedicated production Cloudflare token.

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `PRODUCTION_URL`: use the production workers.dev URL before launch; change it to `https://elianacorre.com` only in the launch issue.

The environment is restricted to protected branches and requires Grégory's approval. Production deployment therefore requires:

1. A manual `Deploy production` workflow dispatch.
2. A selected SHA that is an ancestor of `main`.
3. Protected environment approval.

## Credential setup

Run commands from the repository root. `gh secret set` prompts securely for values.

Each Convex deployment requires these declared environment variables:

- `BETTER_AUTH_SECRET`: a deployment secret generated with at least 32 random bytes.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: credentials for the environment's Google OAuth client.
- `SITE_URL`: the public application origin, without a trailing path.
- `WHITELIST_SEED`: a JSON array of explicitly authorized administrator email addresses.

Set these through the Convex dashboard under **Deployment Settings → Environment Variables**. For preview deployments, configure project-level
preview defaults under **Project Settings → Environment Variables** so a new preview can deploy successfully. The pull-request workflow replaces
the preview default `SITE_URL` with that PR's exact Worker alias immediately after deployment.

Google OAuth must list `${SITE_URL}/api/auth/callback/google` as an authorized redirect URI. Google does not support wildcard redirect URIs, so add
the exact active pull-request callback before testing Google sign-in and remove it after the preview is no longer needed. Staging and production
use their fixed Worker origins.

### Preview

The existing preview setup uses:

```bash
rtk gh secret set CONVEX_DEPLOY_KEY --env preview
rtk gh secret set CLOUDFLARE_API_TOKEN --env preview
rtk gh variable set CLOUDFLARE_ACCOUNT_ID --env preview --body "ACCOUNT_ID"
rtk gh variable set CLOUDFLARE_WORKERS_SUBDOMAIN --env preview --body "SUBDOMAIN"
```

The Convex key is created under the production project's **Settings → Deploy Keys** as a Preview Deploy Key.

### Persistent staging

Convex recommends a separate project for permanent staging.

1. In the Convex dashboard, create a project named `elianacorre.com staging` in the same team.
2. Open its production deployment **Settings → Deploy Keys**.
3. Create `GitHub staging` with only `deployment:deploy`.
4. In Cloudflare **Manage Account → API Tokens**, create `elianacorre.com GitHub staging`.
5. Grant only **Account → Workers Scripts → Edit** for the relevant account.
6. Store the values:

   ```bash
   rtk gh secret set CONVEX_DEPLOY_KEY --env staging
   rtk gh secret set CLOUDFLARE_API_TOKEN --env staging
   rtk gh variable set CLOUDFLARE_ACCOUNT_ID --env staging --body "ACCOUNT_ID"
   rtk gh variable set STAGING_URL --env staging \
     --body "https://elianacorre-com-staging.SUBDOMAIN.workers.dev"
   ```

Replace `SUBDOMAIN` with the prefix before `.workers.dev`.

### Production

Production uses the existing production project and Worker:

```bash
rtk gh secret set CONVEX_DEPLOY_KEY --env production
rtk gh secret set CLOUDFLARE_API_TOKEN --env production
rtk gh variable set CLOUDFLARE_ACCOUNT_ID --env production --body "ACCOUNT_ID"
rtk gh variable set PRODUCTION_URL --env production \
  --body "https://elianacorre-com.SUBDOMAIN.workers.dev"
```

Do not attach `elianacorre.com` or set it as `PRODUCTION_URL` before the launch issue.

Verify names without exposing values:

```bash
rtk gh secret list --env preview
rtk gh variable list --env preview
rtk gh secret list --env staging
rtk gh variable list --env staging
rtk gh secret list --env production
rtk gh variable list --env production
```

## Pull-request preview

`.github/workflows/pull-request.yml`:

1. Runs Oxfmt, Oxlint, type checking, tests, and builds.
2. Creates or reuses Convex preview `pr-<number>`.
3. Builds `apps/web` with the preview Convex URL.
4. Seeds missing administrator profiles from `WHITELIST_SEED` when the preview is first created.
5. Sets the preview deployment's Better Auth `SITE_URL` to the exact Cloudflare preview alias.
6. Uploads an aliased Cloudflare preview version.
7. Attaches the URL, exact head SHA, and workflow run to the pull request.
8. Waits for protected pull-request approval.

Expected URL:

```text
https://pr-<number>-elianacorre-com-preview.<subdomain>.workers.dev
```

Verify that the URL returns HTTP 200, the comment SHA equals the PR head, and test submissions do not appear in production.

## Persistent staging

`.github/workflows/deploy-staging.yml` runs after each push to protected `main`.

It checks out the exact merge SHA, deploys to the separate Convex staging project, seeds missing administrator profiles, builds with that staging URL,
and deploys `elianacorre-com-staging`.

Verify after every merge:

```bash
rtk gh run list --workflow "Deploy staging" --limit 5
rtk gh run view RUN_ID
rtk proxy curl --fail --location --output /dev/null \
  --write-out "%{http_code} %{url_effective}\n" \
  "https://elianacorre-com-staging.SUBDOMAIN.workers.dev"
```

Client review and unfinished feature testing happen on staging, not production.

## Production release

Production does not run on a push to `main`.

Before release:

1. Confirm the selected commit passed pull-request checks and staging review.
2. Confirm the client approved the release contents.
3. Confirm no incompatible Convex schema rollback is involved.
4. Dispatch the workflow from GitHub Web: **Actions → Deploy production → Run workflow**. Enter the full `main` commit SHA and release reason.

   Terminal fallback:

   ```bash
   rtk gh workflow run deploy-production.yml \
     --ref main \
     --field ref=RELEASE_SHA \
     --field reason="Release NIA-123"
   ```

5. Open the pending deployment and approve the protected `production` environment.
6. Monitor:

   ```bash
   rtk gh run list --workflow "Deploy production" --limit 5
   rtk gh run view RUN_ID
   ```

The workflow rejects a SHA that is not reachable from `main`.

Before custom-domain launch, verify the production workers.dev URL. After the dedicated launch issue attaches `elianacorre.com`, verify both the custom domain and Worker version provenance.

## Custom-domain launch boundary

Attaching `elianacorre.com` is a separate release decision, not normal deployment setup.

The launch issue must:

1. Confirm all client-approved features are present on staging.
2. Record the release SHA.
3. Release that SHA to production and verify the production workers.dev URL.
4. Add `elianacorre.com` as a Cloudflare Custom Domain for `elianacorre-com`.
5. Update `PRODUCTION_URL` to `https://elianacorre.com`.
6. Verify DNS, TLS, routes, contact submission, and rollback.

Do not alter the existing custom-domain binding outside that issue.

## Failure and rollback

### Staging failure

A staging failure does not affect the public site or production data. Fix it through a Linear issue and pull request. Rerunning is appropriate only when the failure was external and the commit has not changed.

### Production failure

If production fails before the Worker deploy, the previous Worker version remains active. Inspect whether Convex, the application build, or Cloudflare failed before retrying.

### Redeploy a known-good production commit

Dispatch `Deploy production` with a known-good SHA from `main` and an incident reason. Protected approval is required again.

Treat Convex schema rollback carefully: old functions must remain compatible with current production data.

### Cloudflare-only rollback

Use only when production Convex is compatible and the fault is limited to the Worker:

```bash
cd apps/web
rtk proxy bunx wrangler deployments list --name elianacorre-com
rtk proxy bunx wrangler rollback VERSION_ID \
  --name elianacorre-com \
  --message "Rollback INCIDENT_REFERENCE" \
  --yes
```

Production releases and rollbacks require Grégory's explicit authorization.

## AI-to-human mapping

| AI-assisted action         | Human equivalent                                                  |
| -------------------------- | ----------------------------------------------------------------- |
| Configure environments     | Use GitHub Settings or the documented `rtk gh` commands           |
| Store credentials          | Run `rtk gh secret set` and paste at the secure prompt            |
| Inspect preview or staging | Open the Actions run and workers.dev URL                          |
| Release production         | Dispatch the workflow, then approve the protected environment     |
| Roll back                  | Dispatch a known-good SHA or use the documented Wrangler rollback |

Update this runbook whenever provider names, secret names, deployment triggers, environment protections, URLs, or rollback behavior change.
