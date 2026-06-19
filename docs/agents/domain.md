# Domain docs

This is a multi-context repository. Engineering skills should use its domain documentation as described below.

## Before exploring

1. Read `CONTEXT-MAP.md` at the repository root when it exists.
2. Follow the map to each `CONTEXT.md` relevant to the task. Context files may live under `apps/*/` or `packages/*/`.
3. Read relevant system-wide ADRs under `docs/adr/`.
4. Read relevant context-specific ADRs beside the context, typically under `apps/<context>/docs/adr/` or `packages/<context>/docs/adr/`.

If any of these files do not exist, proceed silently. Do not suggest creating them upfront. Domain-modeling skills create them lazily when terminology or architectural decisions are resolved.

## File structure

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                         ← system-wide decisions
├── apps/
│   └── <context>/
│       ├── CONTEXT.md
│       └── docs/adr/                 ← app-specific decisions
└── packages/
    └── <context>/
        ├── CONTEXT.md
        └── docs/adr/                 ← package-specific decisions
```

## Use glossary vocabulary

When output names a domain concept in an issue title, proposal, hypothesis, or test, use the term defined in the relevant `CONTEXT.md`. Do not drift to synonyms that the glossary explicitly avoids.

If a needed concept is absent, reconsider whether the term belongs to the project. If it exposes a genuine gap, note it for domain modeling.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, identify the conflict explicitly instead of silently overriding the decision.
