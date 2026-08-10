# Eliana Corré Platform

Production Bun/Turbo monorepo for the public website, authenticated application, shared domain code, and Convex backend.

## Commands

Package manager: Bun 1.3.10.

- `bun run test`
- `bun run typecheck`
- `bun run check`
- `bun run build`
- `bun run fix`

Oxfmt and Oxlint are authoritative for formatting and mechanically enforceable code conventions. Do not duplicate their rules in prose.

## Work

Linear is the sole source of actionable project work. Read the complete issue, comments, relations, and acceptance criteria before implementing.

See `docs/agents/issue-tracker.md`.

Do not create GitHub Issues.

## Domain

This repository uses one shared domain context.

Use `CONTEXT.md` for canonical terminology and read only relevant ADRs under `docs/adr/`. Flag conflicts with an existing ADR instead of silently overriding it.

See `docs/agents/domain.md`.

## Agent collaboration

During implementation, perform the repository inspection and focused verification needed to make progress.

Commit, push, pull-request creation, Linear state changes, complete delivery verification, deployment, and merge remain human-owned unless explicitly delegated.

Load runbooks only when the active task requires them.

See `docs/agents/collaboration.md`.

## Delivery

See `docs/workflows/delivery.md` for lifecycle rules and `docs/runbooks/verification.md` for verification commands.
