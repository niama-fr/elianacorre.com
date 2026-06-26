# Agent efficiency

Use this contract to minimize agent consumption without weakening the delivery workflow.

## Default operating mode

Codex focuses on work where repository context and technical judgment add material value:

- issue refinement and implementation;
- diagnosis and root-cause analysis;
- targeted tests and checks while changing code;
- code, standards, and specification review;
- preparing exact commands and evidence for manual delivery.

Grégory handles routine, observable operations by default:

- the final complete verification suite;
- waiting for GitHub checks and preview deployment;
- preview inspection when no technical diagnosis is required;
- protected-environment approval;
- squash merge;
- staging workflow and HTTP verification;
- Linear delivery-complete comment and status transition.

An explicit request such as “finish delivery autonomously” authorizes Codex to perform those routine operations for that issue.

## Progressive documentation loading

Start with the Linear issue and `AGENTS.md`. Do not preload every linked runbook.

Open only the document needed for the active phase:

- implementation ambiguity: the relevant domain documentation;
- verification command uncertainty: `docs/agents/verification.md`;
- PR, review, or merge operation: the relevant section of `docs/agents/delivery-workflow.md` or `docs/agents/manual-delivery.md`;
- deployment or rollback: the relevant section of `docs/agents/deployment.md`.

Reuse instructions already read in the current session. Search for a heading or command before opening an entire large document.

## Verification and command output

Codex runs focused tests, type checks, or lint checks needed to develop and diagnose the current change.

Before running the complete verification suite repeatedly, Codex asks Grégory to run it and return the command summary, unless:

- the user explicitly requested autonomous completion;
- the change is high risk and Codex needs the result to continue safely;
- a previous failure requires a targeted rerun to confirm the fix.

Successful builds and deployments should use concise or filtered output. Record the command, exit status, warnings, and final summary. Retrieve
full logs only for a failure or a specific investigation. A full build does not need to be delegated solely because it is verbose; suppressing
successful output is usually sufficient.

Human procedure from the repository root:

```bash
rtk test bun run test
rtk proxy bun run typecheck
rtk proxy bun run check
rtk proxy bun run build
rtk git diff --check
```

Report each command as pass or fail and include only relevant warnings or failing output. Codex may then reconcile acceptance criteria without
rerunning unchanged commands.

## Manual delivery handoff

When implementation and review are complete, Codex supplies:

- the exact branch and commit SHA;
- commands still required;
- the PR URL and expected checks;
- preview scenarios, if any;
- exact approval, merge, staging, and Linear closure steps;
- conditions that require returning to Codex, such as a failed check, changed commit, merge conflict, or unexpected preview behavior.

Evidence supplied by Grégory is accepted when it names the exact commit and command or workflow result. A new commit invalidates earlier final
verification and review evidence.

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
