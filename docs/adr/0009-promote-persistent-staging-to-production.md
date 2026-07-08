# Promote persistent staging to production

## Status

Accepted.

## Context

Per-pull-request Convex and Cloudflare previews gave every branch a different origin. Google OAuth requires exact callback origins, making each preview a manual credential operation. The repository has one developer, local development already provides pre-merge validation, and production must remain isolated from changes accumulated on `main` until an explicit release.

## Decision

Use GitHub Actions as the only deployment orchestrator. Pull requests run quality, type checking, tests, and a production build without deploying. Every merge to `main` deploys the persistent staging Worker and the production deployment of the separate staging Convex project. A protected manual production workflow promotes only the latest successful staging commit, redeploys that code to the isolated production Convex project and Worker, then records the result as a SemVer GitHub Release.

Local development uses the personal development deployment in the staging Convex project. Staging data remains disposable and is never promoted to production. Dev, staging, and production keep separate Better Auth secrets; dev and staging share a non-production Google OAuth client while production uses a separate client. Convex schema changes use expand-and-contract releases so Worker rollback remains possible.

## Considered options

- Keep per-PR previews: rejected because they add dynamic OAuth origins and infrastructure without an independent reviewer.
- Use a `develop` branch for staging: rejected because it adds branch synchronization while `main` can safely act as the integration branch.
- Use Cloudflare Git builds: rejected because GitHub Actions already coordinates Convex deployment, seeding, frontend build, and Worker deployment.
- Promote staging data: rejected because production identities, content, contacts, and future consent records require an isolated authoritative store.

## Consequences

Manual browser validation happens locally before merge and on staging after merge. Production releases use explicit stable SemVer versions beginning with `v1.0.0`; package manifests remain private and internally unversioned. Rollback is a separate protected operation targeting an existing release tag and defaults to the Worker only because Convex rollback depends on schema and data compatibility.

## Links

- [NIA-31](https://linear.app/niama/issue/NIA-31/simplify-delivery-around-persistent-staging-and-semantic-production)
- [Convex multiple deployments](https://docs.convex.dev/production/multiple-deployments)
- [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
