# Delivery workflow

This contract applies to human contributors and coding agents working on `elianacorre.com`.

## Systems of record

Each artifact has one canonical home:

| System | Owns |
| --- | --- |
| Linear | Actionable work, PRDs, priority, ownership, dependencies, acceptance criteria, and status |
| GitHub | Git repositories, branches, commits, pull requests, code review, CI results, releases, and deployment provenance |
| Obsidian | Evolving research, exploration, meeting notes, and personal or team knowledge |
| Google Drive | Original artwork, photography, contracts, and collaborative business-document drafts |
| Repository ADRs | Finalized technical and architectural decisions |
| Git | Final published website copy and code-ready assets |

Link canonical artifacts across systems instead of copying their contents. Task status exists only in Linear. Final ADR text and published copy exist only in Git.

## Work lifecycle

Work moves through:

`Backlog → Ready → In Progress → In Review → Done`

Use `Blocked` when progress cannot continue because of an unresolved dependency or required external decision. Record the blocker and its owner on the issue. Return the issue to its previous actionable state when the blocker is removed.

### Ready criteria

An issue is `Ready` only when it has:

- One concrete, independently verifiable outcome.
- Acceptance criteria.
- Relevant context, links, and assets.
- Known dependencies and explicit blocking relations.
- Verification instructions.
- Explicit exclusions where the scope could be ambiguous.

Codex may refine incomplete `Backlog` issues but must not implement them until they meet these criteria.

### Work in progress

The project WIP limit is one `In Progress` issue. Urgent work must explicitly block or move the current issue before another issue starts.

## Delivery rules

1. Every durable code or repository change starts from a `Ready` Linear issue. If a request has no issue, Codex creates and scopes one before editing.
2. One Linear issue produces one pull request by default. Multiple pull requests require an explicit plan on the issue.
3. Branch names use `NIA-123/short-description`.
4. Pull request titles use `NIA-123: Meaningful outcome`.
5. Rough checkpoint commits are allowed on issue branches and may be pushed after applicable checks pass.
6. Pull requests are squash-merged. The squash commit title matches the pull request title.
7. Direct commits and pushes to `main` are prohibited. NIA-5 was the one-time repository-bootstrap exception.
8. Required checks and review must pass before merge. The branch must be current with `main`.
9. Codex performs a final two-axis review against repository standards and the Linear issue before approval.
10. Grégory approves the protected `pull-request-approval` environment and merges the pull request. GitHub does not allow a pull-request author to approve their own review, so the environment approval is the enforceable human gate for this solo repository.
11. Production deploys automatically from the approved merged commit.

## GitHub enforcement

Pull requests targeting `main` expose six stable required checks:

- `Ultracite`
- `Typecheck`
- `Tests`
- `Build`
- `Preview`
- `Approval`

The first four checks run the commands in `docs/agents/verification.md`. `Preview` starts only after they pass and deploys isolated Convex data and a Cloudflare preview. `Approval` starts only after the preview succeeds and waits for Grégory to approve the protected `pull-request-approval` environment.

The `main` ruleset requires pull requests, all six checks, and a branch current with `main`. It blocks branch deletion and non-fast-forward updates. GitHub Issues remain disabled because Linear is the issue tracker.

Deployment setup, verification, and rollback are documented in `docs/agents/deployment.md`.

## Codex authority

Codex may:

- Create and refine Linear issues.
- Move issues through workflow states as work progresses.
- Create issue branches.
- Edit files, run checks, commit, push, and open pull requests.
- Add verification evidence and pull request links to Linear.

Codex must obtain Grégory's explicit approval before:

- Merging a pull request.
- Triggering a manual production deployment.
- Expanding work beyond the active issue's agreed scope.

## Technical decisions and content

Exploration begins in Obsidian when useful. Once a technical decision is final, record it as a repository ADR and link it from the relevant Obsidian note and Linear issue.

Google Drive holds source assets and collaborative drafts. Optimize and copy production assets into Git or the production asset store. Never make the website depend on personal Drive links. Final published website copy lives in Git.

## Solid 2 migration

`apps/solid` is the production application. `apps/solid2` is the migration application.

Solid 2 may replace Solid 1 only when:

- It has feature parity with the production application.
- Critical user flows have automated tests.
- Ultracite reports zero errors.
- Type checking and production builds pass.
- An isolated staging deployment has been reviewed and approved by Grégory.

The replacement happens in a dedicated issue and pull request that renames the migration application to `solid` and removes the previous implementation.
