# Contributing

Actionable work is managed in the [elianacorre.com Linear project](https://linear.app/niama/project/elianacorrecom-9ad653bd32f2). GitHub Issues are intentionally disabled.

Every durable change follows the repository's [delivery workflow](docs/agents/delivery-workflow.md):

1. Start from a Ready Linear issue.
2. Create an `NIA-123/short-description` branch.
3. Open a pull request titled `NIA-123: Meaningful outcome`.
4. Obtain a final Codex review against the issue and repository standards.
5. Wait for the required `Quality`, `Typecheck`, `Tests`, and `Build` checks.
6. Grégory squash-merges the current branch into `main`.

Run the documented [verification commands](docs/agents/verification.md) locally before requesting merge.
