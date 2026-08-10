# Agent collaboration

Use this contract to keep agent work focused while preserving human control over delivery and external systems.

## Responsibility boundary

Within explicitly delegated implementation or diagnosis, the agent may autonomously:

- inspect the repository and relevant project documentation;
- edit files within the delegated scope;
- run focused tests, type checks, lint checks, or other low-cost verification needed to make progress;
- investigate failures and perform the smallest useful reruns;
- prepare commit, pull-request, verification, and delivery instructions.

Unless explicitly delegated, Grégory remains responsible for:

- the final complete verification suite;
- commits and pushes;
- pull-request creation;
- Linear mutations and workflow-state changes;
- protected-environment approvals;
- deployment and rollback;
- merge and production operations.

A request authorizes the named operation and the technical substeps inherently required to complete it. It does not automatically authorize the next delivery operation.

When an operation is clearly expensive or has external effects, surface that boundary before performing it.

## Working mode

For non-trivial work, understand the relevant code and requirements before editing.

Before making the first implementation change, establish a compact working plan containing:

- **Assumptions** — the important facts or interpretations the implementation currently relies on, especially anything not directly proven by the issue, code, domain context, or ADRs.
- **First slice** — the smallest end-to-end change that can validate the implementation direction.
- **Verification mapping** — which focused test, type check, runtime check, or other evidence will demonstrate that each important behaviour works.

Keep this planning lightweight. It may exist in the active agent context rather than as a separate document unless the work is large enough to require a specification.

If a material assumption remains unresolved and could substantially change the implementation, resolve it before expanding the change.

Use a tracer-bullet approach: implement the first small end-to-end slice, verify it, then expand incrementally.

During implementation, use focused feedback loops rather than repeatedly running the complete repository suite.

Grégory-directed package updates follow the standing exception defined in `docs/workflows/delivery.md`.

## Progressive documentation loading

Start with the active Linear issue and `AGENTS.md`.

Load additional documentation only when the current task needs it:

- domain terminology or decisions → `CONTEXT.md` and relevant ADRs;
- verification commands → `docs/runbooks/verification.md`;
- manual PR or merge procedure → `docs/runbooks/manual-delivery.md`;
- deployment or rollback → `docs/runbooks/deployment.md`.

Do not preload unrelated runbooks or large documents.

Reuse context already established in the current session and prefer targeted searches or relevant sections over reading large documents in full.

## Handoff

When delegated implementation is complete, leave the working tree in a reviewable state and summarize:

- what changed;
- relevant focused verification already performed;
- unresolved questions or risks;
- remaining human-owned verification or delivery steps;
- proposed commit and pull-request wording when useful.

Do not commit, push, create a pull request, mutate Linear, deploy, or merge unless explicitly delegated.
