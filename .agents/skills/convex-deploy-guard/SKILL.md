---
name: convex-deploy-guard
description: "Classify the target Convex deployment before any deployment-affecting command. Local anonymous verification is allowed; every remote mutation requires explicit delegation, with fresh consent for production."
---

# Convex deployment target guard

Convex deployments are external systems. Repository implementation authority does not implicitly authorize changing them.

## Target classes

Before any deployment-affecting command, classify the target as:

* `local-anonymous`
* `dev`
* `preview`
* `prod`

Determine the target from `CONVEX_DEPLOYMENT`, `convex.json`, deployment keys, or the official Convex status tooling.

If the target is ambiguous or sources disagree, stop and resolve the ambiguity before acting.

## Authority

### Local anonymous

Local anonymous Convex verification is allowed during delegated implementation when useful:

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev --once
```

This is the preferred agent feedback loop when backend push/schema validation is needed.

### Remote dev or preview

Any command that mutates a remote dev or preview deployment requires explicit delegation for that remote operation.

Before running it:

1. identify the exact deployment;
2. announce the target and intended mutation;
3. confirm that the user's current instruction explicitly delegates the remote operation.

Do not infer remote-deployment authority from permission to implement, test, diagnose, or verify code.

### Production

Production mutations require fresh explicit consent for the specific operation, target, and current session.

This includes, but is not limited to:

* `npx convex deploy`;
* `npx convex run --prod` when it mutates state;
* production environment-variable changes;
* production imports;
* mutating production MCP tools.

Previous consent does not carry forward to another production operation.

## Read-only sessions

If the user requests read-only operation, perform no Convex mutations for the remainder of the session:

* no deploy;
* no remote `dev` push;
* no environment changes;
* no mutating `run`;
* no imports;
* no mutating MCP tools.

Production inspection must not implicitly enable production mutation tooling.

## Rules

* Identify the deployment before every deployment-affecting command.
* Local anonymous verification is the default when a Convex push is useful only for validation.
* Every remote mutation requires explicit delegation.
* Production additionally requires fresh per-action consent.
* Never guess the deployment target.
* A failed or apparently ineffective deployment is diagnosed before any retry.
* This guard applies before every Convex skill or workflow that can mutate a deployment.
