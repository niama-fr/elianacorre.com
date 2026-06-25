# Issue tracker: Linear

Issues, PRDs, priorities, ownership, dependencies, and work status for this repository live in the Niama Linear workspace:

- Team: `Niama`
- Project: [`elianacorre.com`](https://linear.app/niama/project/elianacorrecom-9ad653bd32f2)
- Issue prefix: `NIA`

Use the Linear integration available to the agent for issue and project operations. If the integration is unavailable, stop before changing code and restore access rather than creating a second task record elsewhere.

## Conventions

- Read the complete issue, comments, relations, and project context before implementation.
- Create actionable work in the `elianacorre.com` Linear project unless the work belongs to another explicit Niama project.
- Record acceptance criteria as checkboxes and list blocking issues explicitly.
- Treat acceptance criteria as transition gates:
  - Codex checks objective technical criteria after verification and before moving an issue to `In Review`.
  - Criteria requiring human judgment remain unchecked with an issue comment naming the owner and expected validation.
  - Missing implementation blocks `In Review`; pending named human validation does not.
  - All criteria must be checked or explicitly revised before `Done`.
- Keep issue status current as work moves through the delivery workflow.
- Add the pull request and material verification evidence to the issue.
- Mark an issue `Done` only after its approved pull request is merged and required follow-up work is complete.
- Do not create or use GitHub Issues for this repository. GitHub Issues are disabled intentionally.

## Creating an issue manually

Use the Niama team template **Elianacorre.com delivery issue** from the Linear issue creation modal:

1. Press `Option/Alt+C`, or select **Create issue**.
2. Select the `Niama` team.
3. Select **Template → Elianacorre.com delivery issue**.
4. Set the project to `elianacorre.com`.
5. Replace every placeholder and delete sections that genuinely do not apply.
6. Keep the issue in `Backlog` until it meets all Ready criteria in `docs/agents/delivery-workflow.md`.

The template is guidance, not proof that an issue is Ready. Before moving it to `Ready`, confirm the outcome is independently verifiable,
acceptance criteria are observable, dependencies and exclusions are explicit, and verification can be performed by someone other than the
author.

## Template structure

The team template uses this structure:

```markdown
## Outcome

<!-- Describe one independently verifiable result, not a list of activities. -->

## Context

<!-- Explain why this work is needed. Link source material and related issues instead of copying canonical content. -->

## Acceptance criteria

- [ ] <!-- Observable product, code, documentation, or operational result. -->
- [ ] <!-- Add human approval criteria explicitly when visual, editorial, business, or client judgment is required. -->

## Verification

<!-- List exact commands, manual scenarios, URLs, or evidence needed to prove the criteria. -->

## Dependencies

<!-- List blockers and related issues. Write "None" when there are no dependencies. -->

## Exclusions

<!-- State adjacent work that is intentionally outside this issue. -->

## Human validation

<!-- Name the owner and expected evidence for criteria that automation or Codex cannot decide. Write "None" when fully objective. -->
```

## When a skill says "publish to the issue tracker"

Create a Linear issue in the appropriate project.

## When a skill says "fetch the relevant ticket"

Fetch the Linear issue, including comments and relations.

See `docs/agents/delivery-workflow.md` for readiness, WIP, branch, pull request, review, and merge rules.
