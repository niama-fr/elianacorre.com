# Deployment

The stable application (`apps/solid`) uses Convex for data and Cloudflare Workers for hosting. Pull requests receive isolated previews; approved merges to `main` deploy automatically to production.

`apps/solid2` remains a migration application and is not deployed by these workflows.

## Deployment topology

| Target | Convex | Cloudflare Worker | Trigger |
| --- | --- | --- | --- |
| Pull-request preview | One preview deployment named `pr-<number>` | `elianacorre-com-preview`, alias `pr-<number>` | All four quality checks pass |
| Production | Production deployment | `elianacorre-com` | An approved pull request is merged to `main` |

Preview credentials cannot deploy to Convex production and use a separate Cloudflare API token. Preview builds receive the preview deployment URL as `VITE_CONVEX_URL`, so preview traffic cannot write to production data.

## One-time GitHub setup

Create two GitHub environments in **Settings → Environments**:

- `preview`
- `production`

Each environment stores values with the same names, but the secret values must be independently scoped.

Restrict `production` to protected branches. Leave `preview` available to pull-request branches. The repository currently enforces this production branch policy in GitHub.

### Preview environment

Secrets:

- `CONVEX_DEPLOY_KEY`: a Convex **Preview Deploy Key**.
- `CLOUDFLARE_API_TOKEN`: a dedicated preview token with **Account → Workers Scripts → Edit**.

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_WORKERS_SUBDOMAIN`: the prefix before `.workers.dev`.

### Production environment

Secrets:

- `CONVEX_DEPLOY_KEY`: the Convex **Production Deploy Key**.
- `CLOUDFLARE_API_TOKEN`: a separate production token with **Account → Workers Scripts → Edit**.

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `PRODUCTION_URL`: `https://elianacorre.com`

Do not configure required reviewers on `preview` or `production`. Preview runs after automated checks, and production authorization is the protected pull-request approval followed by the explicit merge. Adding a second production reviewer would prevent automatic post-merge deployment.

Use two Cloudflare tokens even when both target the same account. Revoking preview automation must not revoke production automation.

Cloudflare scopes Workers Scripts permission at the account level, not at one Worker name. Separate tokens isolate credential lifecycle but do not stop a compromised preview token from editing another Worker in the same Cloudflare account. Strict provider-level isolation requires a separate Cloudflare account for preview Workers.

### Terminal setup

Run from the repository root. Commands prompt securely for secret values; never put a secret on the command line, in a note, or in shell history.

```bash
rtk gh api --method PUT repos/niama-fr/elianacorre.com/environments/preview
rtk gh api --method PUT repos/niama-fr/elianacorre.com/environments/production

rtk gh secret set CONVEX_DEPLOY_KEY --env preview
rtk gh secret set CLOUDFLARE_API_TOKEN --env preview
rtk gh variable set CLOUDFLARE_ACCOUNT_ID --env preview --body "ACCOUNT_ID"
rtk gh variable set CLOUDFLARE_WORKERS_SUBDOMAIN --env preview --body "SUBDOMAIN"

rtk gh secret set CONVEX_DEPLOY_KEY --env production
rtk gh secret set CLOUDFLARE_API_TOKEN --env production
rtk gh variable set CLOUDFLARE_ACCOUNT_ID --env production --body "ACCOUNT_ID"
rtk gh variable set PRODUCTION_URL --env production --body "https://elianacorre.com"
```

Find the Cloudflare account ID and Workers subdomain in the Cloudflare dashboard under **Workers & Pages**. Create the preview and production Convex deploy keys in the Convex project under **Settings → Deploy Keys**.

## Pull-request preview

`.github/workflows/pull-request.yml` performs this sequence:

1. Run Ultracite, type checking, tests, and both application builds.
2. Create or reuse the isolated Convex deployment `pr-<number>`.
3. Build `apps/solid` with that deployment's URL.
4. Bootstrap `elianacorre-com-preview` with a normal deployment if the Worker does not exist yet.
5. Upload a version with alias `pr-<number>`.
6. Create or update one preview comment on the pull request.
7. Wait for the protected `Approval` environment.

Expected URL:

```text
https://pr-<number>-elianacorre-com-preview.<subdomain>.workers.dev
```

The pull-request comment records the URL, exact commit, isolated Convex deployment name, and workflow run. Linear discovers it through the pull request attached to the `NIA-*` issue.

Verify a preview by checking:

- `Ultracite`, `Typecheck`, `Tests`, `Build`, and `Preview` are green.
- The pull-request preview comment references the current head SHA.
- The preview opens and its contact flow does not create data in Convex production.
- The `Approval` job starts only after `Preview` succeeds.

## Production

`.github/workflows/deploy-production.yml` runs for every push to protected `main`. Because `main` accepts changes only through an approved, current pull request, the workflow deploys the exact squash-merged commit.

The workflow:

1. Checks out the event SHA.
2. Deploys the repository's Convex functions with the production deploy key.
3. Builds `apps/solid` with the production Convex URL.
4. Deploys the resulting Worker with the same Git SHA as its Cloudflare version tag.
5. Records the SHA, reason, and URL in the GitHub Actions summary.

After merge, verify:

```bash
rtk gh run list --workflow "Deploy production" --limit 5
rtk gh run view RUN_ID
```

Then open `https://elianacorre.com` and exercise the changed behavior.

## Failure and recovery

A failed quality check prevents preview. A failed preview prevents approval. A failed merge is impossible while required checks are incomplete.

If production deployment fails:

1. Do not rerun blindly.
2. Open the failed workflow and identify whether Convex, the application build, or Cloudflare failed.
3. If the failure happened before Cloudflare deployment, production traffic still uses the previous Worker version.
4. Correct the issue through a new Linear issue and protected pull request unless restoring a known-good commit is urgent.

### Roll back both Convex and Cloudflare

Use the **Deploy production** workflow's `workflow_dispatch` form:

1. Find a known-good squash commit in GitHub or with `rtk git log main`.
2. Open **GitHub → Actions → Deploy production → Run workflow**.
3. Enter the full known-good commit SHA in `ref`.
4. Enter the incident reason.
5. Run the workflow and verify its summary and production behavior.

This checks out and redeploys both the Convex functions and Worker from that commit. Treat schema rollbacks carefully: old functions must remain compatible with current production data.

CLI equivalent, requiring explicit production authorization:

```bash
rtk gh workflow run deploy-production.yml \
  --ref main \
  --field ref=KNOWN_GOOD_SHA \
  --field reason="Rollback INCIDENT_REFERENCE"
```

### Roll back Cloudflare only

Use this only when the current Convex deployment is known to be compatible and the fault is limited to the Worker:

```bash
cd apps/solid
rtk proxy bunx wrangler deployments list --name elianacorre-com
rtk proxy bunx wrangler rollback VERSION_ID \
  --name elianacorre-com \
  --message "Rollback INCIDENT_REFERENCE" \
  --yes
```

Manual production deploys and rollbacks require Grégory's explicit authorization.

## AI-to-human mapping

| AI-assisted action | Human equivalent |
| --- | --- |
| Configure GitHub environments | Use repository Settings or the documented `rtk gh api` commands |
| Store credentials | Run `rtk gh secret set` and enter values at the secure prompt |
| Inspect preview | Open the PR comment and Actions run |
| Verify production | Inspect the production Actions run and test the public URL |
| Roll back | Run the documented workflow dispatch with a known-good SHA |

Update this runbook whenever provider names, secret names, deployment commands, environments, or rollback behavior change.
