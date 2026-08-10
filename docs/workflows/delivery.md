# Delivery workflow

This document defines the delivery lifecycle for durable repository work.

Operational procedures live in runbooks. Agent authority and human/agent boundaries live in `docs/agents/collaboration.md`.

## Systems of record

Each artifact has one canonical home:

| System          | Owns                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Linear          | Actionable work, priority, ownership, dependencies, acceptance criteria, and status            |
| GitHub          | Branches, commits, pull requests, code review, CI results, releases, and deployment provenance |
| Repository ADRs | Final technical and architectural decisions                                                    |
| Git             | Published application code and code-owned production assets                                    |
| Obsidian        | Exploration, research, meeting notes, and working knowledge                                    |
| Google Drive    | Original assets, contracts, and collaborative business documents                               |

Link canonical artifacts instead of copying their contents between systems.

## Work lifecycle

Work moves through:

`Backlog → Ready → In Progress → In Review → Done`

Use `Blocked` when an unresolved dependency or required external decision prevents progress. Represent dependencies with native Linear relations whenever possible.

When the blocker is removed, return the issue to its appropriate actionable state.

## Ready criteria

An issue is `Ready` only when it has:

- one concrete, independently verifiable outcome;
- acceptance criteria;
- relevant context, links, and assets;
- known dependencies and blocking relations;
- enough verification guidance to determine whether the outcome works;
- explicit exclusions when scope could otherwise be ambiguous.

Incomplete work may be refined while in `Backlog`, but implementation starts only when the issue is sufficiently ready.

Tickets created from an agreed specification through `/to-tickets` are considered agent-ready unless later information invalidates their assumptions.

## Work in progress

The project WIP limit is one `In Progress` issue.

Starting another issue requires the current issue to be completed, blocked, or intentionally moved out of active work.

Prefer small independently verifiable tickets and vertical end-to-end slices over large horizontal implementation batches.

## Acceptance criteria

Acceptance criteria are delivery controls, not a checklist completed after the work is finished.

Before an issue enters `In Review`:

1. Review every acceptance criterion against the implementation and available verification evidence.
2. Objective technical criteria may be checked when demonstrated by code inspection, tests, static checks, builds, or documented configuration.
3. Criteria requiring visual, editorial, business, client, or other human judgment remain pending until the appropriate human validates them.
4. Pending human validation must not hide missing implementation.
5. If implementation changes after a criterion was validated, re-evaluate any affected criterion.

Before an issue enters `Done`:

- every acceptance criterion is satisfied, or the issue has been deliberately revised;
- the approved pull request is merged;
- required follow-up work for the issue is complete;
- the issue links the delivered pull request or equivalent delivery evidence.

## Branch and pull-request rules

By default, one Linear issue produces one pull request.

Multiple pull requests for one issue require an explicit reason or delivery plan.

Branch names use:

`NIA-123/short-description`

Pull-request titles use:

`NIA-123: Meaningful outcome`

Direct commits and pushes to `main` are prohibited.

Pull requests are squash-merged. The resulting squash commit title should match the pull-request title.

Required checks and review must pass before merge, and the branch must satisfy the repository's current `main` protection rules.

## Verification and review

During implementation, use focused verification loops appropriate to the code being changed.

Before delivery, perform the complete verification required by:

`docs/runbooks/verification.md`

Code review is a separate stage from implementation and should preferably run in a fresh agent context against:

- the active issue or specification;
- its acceptance criteria;
- the final diff;
- relevant repository standards and domain decisions.

An issue enters `In Review` only when implementation is complete. Pending explicitly identified human validation may remain, but missing implementation may not.

## Human delivery gate

Final delivery remains human-controlled unless explicitly delegated.

The normal boundary is:

`implement → focused verification → human complete verification → human commit/push/PR → CI → code review → human merge`

The detailed human-operated procedure is documented in:

`docs/runbooks/manual-delivery.md`

Merge is the final human gate for normal pull-request delivery.

## Grégory-directed package updates

Grégory may intentionally update package manifests and the lockfile on an active issue branch without creating a separate Linear issue.

Such updates are considered authorized maintenance within the active issue and pull request when Grégory has made or confirmed that choice.

They still require review as part of the final diff. Raise a concern only when there is a concrete problem, such as:

- failed verification;
- incompatible runtime or peer requirements;
- a required migration;
- a security or licensing problem;
- unintended dependency addition or removal;
- behaviour conflicting with the active issue.

Do not treat the mere presence or number of intentional dependency-version changes as scope expansion.

Never hand-edit generated lockfile resolutions.

## Deployment

Approved merges deploy according to the repository deployment process.

Staging, production promotion, protected-environment approval, release versioning, launch checks, and rollback procedures are defined in:

`docs/runbooks/deployment.md`

Application-specific delivery constraints are documented in:

`docs/runbooks/application-delivery-checks.md`

This workflow defines when work is ready to move between delivery states; the runbooks define how the associated operations are performed.
