# Domain documentation

This repository uses a single shared domain context.

## Sources

- `CONTEXT.md` contains canonical domain vocabulary.
- `docs/adr/` contains durable technical and architectural decisions.

## Usage

For work affecting domain behaviour, read the relevant terms in `CONTEXT.md`. Do not load every ADR. Read only ADRs relevant to the area being changed.

Use canonical glossary terms in code, tests, issues, specifications, and reviews. Do not introduce synonyms for concepts whose glossary entry explicitly rejects them.

When a genuinely new domain concept or durable decision emerges, use the domain-modeling workflow to update the context or create an ADR.

If proposed work conflicts with an ADR, surface the conflict instead of silently overriding the decision.
