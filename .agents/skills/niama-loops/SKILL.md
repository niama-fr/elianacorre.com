---
name: niama-loops
description: "Work with this repository's Niama fork of the Loops Convex component. Use when changing the Loops component integration, provider calls, contact synchronization, transactional email delivery, or component tests."
---

# Niama Loops integration

This repository uses the Niama fork of the Loops Convex component through the package alias:

```json
"@devwithbobby/loops": "npm:@niama/loops@0.2.1"
```

Imports intentionally continue to use `@devwithbobby/loops`.

Do not replace the dependency with upstream `@devwithbobby/loops` unless explicitly requested.

## Integration points

The component is mounted in:

`packages/backend/convex/convex.config.ts`

using:

```ts
import loops from "@devwithbobby/loops/convex.config";
```

The application-level provider boundary is:

`packages/backend/features/loops.ts`

It creates:

```ts
const loops = new Loops(components.loops);
```

and currently uses component operations including:

* `addContact`
* `unsubscribeContact`
* `deleteContact`
* `sendTransactional`

Tests register the component through:

```ts
import { register as registerLoops } from "@devwithbobby/loops/test";
```

## Architectural boundary

The Loops component is an external-delivery adapter, not the application's source of truth.

Before changing Loops-related behaviour, read:

* `CONTEXT.md`
* `docs/adr/0001-use-loops-for-email-delivery.md`

Preserve these boundaries:

* Convex owns Profiles and newsletter consent.
* Loops does not determine delivery eligibility.
* Application-owned `loopsTasks` records represent delivery intent and visible outcome.
* `@convex-dev/workflow` owns durable execution, scheduling, retries, and recovery.
* Provider identifiers remain lookup attributes rather than primary identity.
* Business state must not depend on Loops being available.

Do not move consent, privacy, subscription, access-right, or delivery-eligibility decisions into the component integration.

## Working guidance

When modifying the integration:

1. Inspect the local business wrapper before calling the component directly.
2. Reuse application-owned task and workflow boundaries where applicable.
3. Preserve idempotency for transactional delivery.
4. Keep provider-specific details behind the existing Loops boundary.
5. Update or add focused backend tests for changed behaviour.
6. Treat webhook ordering, duplicate delivery, unsubscribe/resubscribe behaviour, and privacy erasure as domain-sensitive paths.

Do not assume APIs described by the old upstream `devwithbobby-loops` skill exist in the Niama fork. Verify the installed package or current local usage when adding a component operation.
