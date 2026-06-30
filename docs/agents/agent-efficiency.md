# Agent efficiency

Use this contract to minimize agent consumption without weakening the delivery workflow.

## Explicit authorization boundary

Codex asks Grégory before performing an operation that Grégory can reasonably complete himself. It does not proactively execute routine commands,
verification, delivery steps, external-system changes, or adjacent cleanup merely because it can automate them.

A direct request authorizes only the stated outcome and the technical substeps inherently required to produce it. It does not authorize related
checks, publishing, workflow-state changes, deployment, merge, cleanup, or follow-up work unless Grégory explicitly includes them. When the scope of
authorization is uncertain, Codex asks before acting.

Read-only inspection and low-cost focused checks required to implement or diagnose an explicitly delegated change are part of that delegated work.
Before any costly or routine operation, Codex describes the operation and asks Grégory to perform it or explicitly delegate it. Once Grégory delegates
an operation, Codex may complete that operation and its necessary substeps without repeatedly asking for the same permission.

## Default operating mode

Codex focuses on work where repository context and technical judgment add material value:

- issue refinement and implementation;
- diagnosis and root-cause analysis;
- targeted tests and checks while changing code;
- code, standards, and specification review;
- preparing exact commands and evidence for manual delivery.

Grégory handles routine, observable operations by default:

- the final complete verification suite;
- waiting for GitHub checks;
- protected-environment approval;
- squash merge;
- staging workflow and HTTP verification;
- Linear delivery-complete comment and status transition.

An explicit request such as “finish delivery autonomously” authorizes Codex to perform those routine operations for that issue. Authorization for one
issue or operation does not carry into later issues, turns, or adjacent work.

For routine delivery, Codex should use the simplified manual loop in `docs/agents/manual-delivery.md`: Linear App for issue state, GitHub Desktop
for branch/commit/push/PR creation, Codex for implementation help and review, and GitHub Web for checks and merge. Do not prefer VS Code
or terminal tasks for approval, merge, or production release unless Grégory explicitly asks for a fallback.

## Progressive documentation loading

Start with the Linear issue and `AGENTS.md`. Do not preload every linked runbook.

Open only the document needed for the active phase:

- implementation ambiguity: the relevant domain documentation;
- verification command uncertainty: `docs/agents/verification.md`;
- PR, review, or merge operation: the relevant section of `docs/agents/manual-delivery.md`;
- deployment or rollback: the relevant section of `docs/agents/deployment.md`.

Reuse instructions already read in the current session. Search for a heading or command before opening an entire large document.

## Verification and command output

Within explicitly delegated implementation or diagnosis, Codex may run low-cost focused tests, type checks, or lint checks needed to continue safely.
It asks Grégory before running costly verification.

Before running the complete verification suite repeatedly, Codex asks Grégory to run it and return the command summary, unless:

- the user explicitly requested autonomous completion;
- the change is high risk and Codex needs the result to continue safely;
- a previous failure requires a targeted rerun to confirm the fix.

Successful builds and deployments should use concise or filtered output when Grégory explicitly delegates them. Record the command, exit status,
warnings, and final summary. Retrieve full logs only for a failure or a specific investigation.

Human procedure from the repository root:

```bash
rtk test bun run test
rtk proxy bun run typecheck
rtk proxy bun run check
rtk proxy bun run build
rtk git diff --check
```

Report each command as pass or fail and include only relevant warnings or failing output. A concise confirmation such as “all good” is sufficient when
it directly answers a checklist Codex just supplied. Codex accepts that evidence and does not rerun unchanged verification.

## Manual delivery handoff

When implementation and review are complete, Codex supplies:

- the exact branch and commit SHA;
- commands still required;
- the PR URL and expected checks;
- staging scenarios, if any;
- exact approval, merge, staging, and Linear closure steps;
- conditions that require returning to Codex, such as a failed check, changed commit, merge conflict, or unexpected staging behavior.

Evidence supplied by Grégory is accepted when it names the exact commit and command or workflow result, or when it directly confirms an exact
checklist Codex just supplied. Codex does not independently reverify accepted evidence. It asks for clarification instead of rerunning when evidence
is ambiguous. A relevant code change or new commit invalidates affected verification; an explicit diagnosis request also authorizes the smallest
necessary rerun.

## Thread Closeout

Closeout has two different artifacts:

- A temporary handoff is an agent-to-agent bridge saved outside the workspace, usually in `/tmp`.
- The canonical session synthesis is the Obsidian record in the Niama vault's `Elianacorre.com` project area.

When Grégory asks to close a thread or session, Codex updates or creates the Obsidian session synthesis before reporting closure if the conversation
produced durable project state. Durable project state includes issue delivery, workflow or runbook changes, technical decisions, implementation work,
verification evidence, plans that future work depends on, and open loops.

The session synthesis records:

- current state;
- open loops, blockers, and owners;
- canonical links to Linear issues, pull requests, repository docs, ADRs, Drive files, and temporary handoffs as applicable;
- the consumption and manual-responsibility report.

Lightweight conversations that produced no durable project state may close without a new or updated Obsidian session note. Codex states that decision
explicitly in the closeout response.

Before reporting a substantial thread closed, Codex verifies and reports:

- the temporary handoff path, if one was created;
- the Obsidian session note path;
- when the vault is Git-backed, the commit SHA containing the session synthesis update.

## Closing Usage Report

Every closing handoff includes:

- work completed by Codex;
- work completed or still owned by Grégory;
- qualitative consumption by phase: low, medium, or high;
- material cost drivers, such as large document reads, verbose logs, repeated verification, web or connector calls, and sub-agents;
- recommendations for what Grégory can do manually next time;
- the highest-value tasks to keep with Codex.

Codex must not claim exact token counts unless an authoritative tool reports them. Qualitative estimates must be labelled as estimates.

## Recovery

If manual evidence is incomplete, Codex asks for the missing command result or URL rather than rerunning the whole workflow. If a manual step
fails, capture the smallest relevant log excerpt and return to Codex for diagnosis.

Update this document whenever the preferred responsibility split, verification commands, delivery gates, or available usage-reporting tools
change.
