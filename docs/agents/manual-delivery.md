# Manual delivery runbook

Use this runbook when operating the `elianacorre.com` delivery workflow without Codex. Follow the steps in order.

## Interface guide

| Interface              | Best use                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Linear app or web      | Issue creation, status, acceptance criteria, dependencies, and issue comments                   |
| VS Code app            | Editing, reviewing local changes, and Source Control inspection                                 |
| VS Code workflow tasks | Repeatable repository verification and GitHub workflow actions                                  |
| GitHub web             | Pull-request descriptions, complete diff review, comments, checks, preview, approval, and merge |
| GitHub Desktop         | Visual branch, commit, and push operations; useful but not the canonical review interface       |
| Terminal               | Universal fallback and the most precise option for Git, GitHub CLI, and verification            |

Linear operations do not have a supported project terminal workflow. Use the Linear app or web when this runbook says there is no terminal
fallback.

## 1. Create the Linear issue

**Purpose:** establish the scope before changing the repository.

**Best interface:** Linear app or web.
**Alternative:** none recommended.
**Terminal fallback:** none; use Linear.

1. Create an issue in team `Niama`.
2. Select the **Elianacorre.com delivery issue** template.
3. Set project `elianacorre.com` and status `Backlog`.
4. Replace every prompt.
5. Set priority, assignee, labels, blockers, and related issues.
6. Leave acceptance criteria unchecked.

The title describes the outcome, not an activity. The description must contain Outcome, Context, Acceptance criteria, Verification,
Dependencies, Exclusions, and Human validation.

## 2. Refine the issue and move it to Ready

**Purpose:** make the issue independently executable and verifiable.

**Best interface:** Linear app or web.
**Terminal fallback:** none; use Linear.

Confirm:

- one independently verifiable outcome;
- observable acceptance criteria;
- exact automated and manual verification;
- explicit blockers and related issues;
- scope exclusions;
- named owners and evidence for human judgment.

Move `Backlog → Ready` only when all points are satisfied. Do not check acceptance criteria yet.

Optional readiness comment:

```markdown
## Ready review

- Outcome is independently verifiable.
- Acceptance criteria are observable.
- Verification steps are complete.
- Dependencies and exclusions are explicit.
- Human validation owner: OWNER or `None`.

Ready for implementation.
```

## 3. Start the issue

**Purpose:** reserve the single work-in-progress slot and create the issue branch.

**Best interfaces:** Linear for status, then VS Code task **Workflow: Start issue branch**.
**Alternatives:** GitHub Desktop for branch creation; terminal for the complete operation.

1. Confirm no other issue is `In Progress`.
2. Move `Ready → In Progress` in Linear.
3. Update local `main`.
4. Create `NIA-123/short-description`.

Terminal:

```bash
rtk git switch main
rtk git pull --ff-only
rtk git switch -c NIA-123/short-description
```

Do not start repository work before the Linear status and branch are correct.

## 4. Implement within scope

**Purpose:** produce only the change authorized by the issue.

**Best interface:** VS Code app.
**Alternatives:** another code editor; GitHub Desktop for observing file status only.
**Terminal fallback:** use normal repository commands through RTK.

Review progress frequently:

```bash
rtk git status -sb
rtk git diff --stat
rtk git diff
```

If scope expands materially, stop and update or create a Linear issue before continuing.

Blocked comment template:

```markdown
## Blocked

Blocker: DESCRIPTION
Owner: PERSON_OR_SYSTEM
Required resolution: ACTION_OR_DECISION
Last verified: YYYY-MM-DD

No further in-scope implementation can continue until this is resolved.
```

Move the issue to `Blocked`; restore its previous actionable state when resolved.

## 5. Verify locally

**Purpose:** prove the repository remains mechanically valid.

**Best interface:** VS Code task **Workflow: Verify all**.
**Alternative:** terminal. GitHub Desktop does not replace verification.

Terminal:

```bash
rtk test bun run test
rtk proxy bun run typecheck
rtk proxy bun run check
rtk proxy bun run build
rtk git diff --check
```

Inspect the final local diff:

```bash
rtk git status -sb
rtk git diff --stat
rtk git diff
```

Do not claim a command passed unless you ran it against the current changes.

## 6. Commit and push

**Purpose:** publish an intentional checkpoint without unrelated files.

**Best interface:** terminal for precise staging.
**Alternatives:** VS Code Source Control or GitHub Desktop after reviewing every selected file.

Terminal:

```bash
rtk git add path/to/intended-file path/to/other-file
rtk git diff --cached --check
rtk git diff --cached
rtk git commit -m "NIA-123: Meaningful checkpoint"
rtk git push -u origin NIA-123/short-description
```

Do not use `git add -A` in a mixed worktree.

## 7. Open a draft pull request

**Purpose:** create the GitHub review and CI artifact while work may still change.

**Best interface:** GitHub web for writing and previewing the description.
**Alternatives:** GitHub Desktop **Create Pull Request** opens the web form; terminal with GitHub CLI.

Terminal:

```bash
rtk gh pr create \
  --draft \
  --base main \
  --head NIA-123/short-description \
  --title "NIA-123: Meaningful outcome"
```

Pull-request description template:

```markdown
## Summary

- CHANGE
- CHANGE

## Why

Explain the problem, root cause, or decision.

## Impact

Explain user, developer, operational, or documentation impact.

## Validation

- `bun run test`
- `bun run typecheck`
- `bun run check`
- `bun run build`
- MANUAL_SCENARIO

## Human validation

- OWNER: REQUIRED_REVIEW, or `None`

Linear: [NIA-123](LINEAR_URL)
```

Attach the PR URL to the Linear issue. The PR remains draft until acceptance-criteria reconciliation is complete.

## 8. Reconcile acceptance criteria

**Purpose:** prove implementation completeness before review starts.

**Best interface:** Linear app or web.
**Supporting interface:** GitHub web and VS Code for evidence.
**Terminal fallback:** none for checkbox updates; use Linear.

1. Compare every checkbox with the final implementation.
2. Check objective criteria proven by tests, checks, builds, configuration, or code inspection.
3. Perform and check human validation that is ready.
4. Leave pending human-owned criteria unchecked.
5. Stop if an unchecked criterion means implementation is missing.

Linear implementation-evidence comment:

```markdown
## Implementation evidence

Pull request: PR_URL
Final implementation commit: `COMMIT_SHA`

Verified:

- `bun run test`
- `bun run typecheck`
- `bun run check`
- `bun run build`
- OTHER_EVIDENCE

Acceptance criteria checked: LIST_OR_ALL_OBJECTIVE_CRITERIA

Pending human validation:

- OWNER — CRITERION — REQUIRED_ACTION

Implementation is complete and ready for review.
```

If no human validation remains, write `Pending human validation: None`.

## 9. Move to In Review and mark the PR ready

**Purpose:** signal that implementation is complete and formal review may begin.

**Best interfaces:** Linear app for status, then VS Code task **Workflow: Mark current PR ready**.
**Alternatives:** GitHub web **Ready for review** button; terminal.

1. Move `In Progress → In Review` in Linear.
2. Mark the GitHub PR ready.

Terminal:

```bash
rtk gh pr ready PR_NUMBER
```

This action does not approve, merge, or deploy.

## 10. Wait for checks and inspect the preview

**Purpose:** verify the pushed commit in CI and its isolated deployment.

**Best interfaces:** VS Code task **Workflow: Watch current PR checks**, then GitHub web for the preview comment.
**Alternatives:** GitHub Actions web; terminal.

Terminal:

```bash
rtk gh pr checks PR_NUMBER --watch --interval 10
```

Wait for `Quality`, `Typecheck`, `Tests`, `Build`, and `Preview`. Open the preview, verify its commit SHA matches the PR head, and perform the
issue’s manual scenarios.

Preview evidence comment when manual preview validation is material:

```markdown
## Preview validation

Reviewed preview: PREVIEW_URL
Commit: `COMMIT_SHA`
Scenarios:

- SCENARIO — PASS
- SCENARIO — PASS

Production data was not used or modified.
Findings: none.
```

If there are findings, document them and return to implementation. Any fix creates a new commit and invalidates later review evidence.

## 11. Perform the final Standards and Spec review

**Purpose:** review what automation cannot decide.

**Best interface:** GitHub web **Files changed** tab, with Linear open beside it.
**Supporting interface:** VS Code diff for deeper local inspection.
**Alternatives:** GitHub Desktop diff for simple changes; terminal for complete diff and metadata.

Terminal preparation:

```bash
rtk git fetch origin
rtk git status -sb
rtk git log main..HEAD --oneline
rtk git diff main...HEAD --check
rtk git diff --stat main...HEAD
rtk git diff main...HEAD
rtk gh pr checks PR_NUMBER
rtk git rev-parse HEAD
```

### Standards review

Inspect:

- only issue-authorized files and behavior changed;
- repository instructions and architecture are respected;
- generated or vendored files were not edited incorrectly;
- naming, types, error handling, security, and maintainability are sound;
- no credentials, debug output, temporary files, or unrelated cleanup;
- verification and required CI checks pass.

### Spec review

Inspect:

- every Linear acceptance criterion is implemented;
- tests and documentation prove the important behavior;
- human validation evidence exists where required;
- exclusions were respected;
- no unapproved scope or missing requirement.

Post this comment only after reviewing the exact final commit:

```markdown
## Final review

Reviewed final commit: `COMMIT_SHA`

### Standards

- Diff contains only NIA-123 changes.
- Repository conventions and ownership boundaries are respected.
- No secrets, unsafe behavior, temporary artifacts, or unrelated changes found.
- Quality, typecheck, tests, build, preview, and diff checks pass.
- Findings: none.

### Spec

- Every NIA-123 acceptance criterion is implemented.
- Tests, documentation, and manual evidence match the final behavior.
- Human validation requirements are complete.
- Exclusions are respected; no unapproved scope found.
- Findings: none.

Ready for protected environment approval.
```

Replace every placeholder. Do not write `Findings: none` if you found an issue. Fix findings, push, wait for checks, and repeat the entire
final review. Any new commit invalidates the previous review.

Terminal comment fallback:

```bash
rtk gh pr comment PR_NUMBER --body-file /path/to/final-review.md
```

## 12. Approve the protected environment

**Purpose:** authorize this reviewed commit to satisfy the human approval gate.

**Best interface:** GitHub Actions web: open the PR workflow, select **Review deployments**, choose `pull-request-approval`, and approve.
**Alternative:** VS Code task **Workflow: Approve current PR deployment**.
**Terminal fallback:**

```bash
rtk gh run list \
  --workflow "Pull request" \
  --branch NIA-123/short-description \
  --limit 3

rtk gh api \
  repos/niama-fr/elianacorre.com/actions/runs/RUN_ID/pending_deployments

rtk gh api \
  --method POST \
  repos/niama-fr/elianacorre.com/actions/runs/RUN_ID/pending_deployments \
  -F 'environment_ids[]=17012820517' \
  -f state=approved \
  -f comment='Approved after final Standards and Spec review of COMMIT_SHA'
```

Approve only after the final-review comment exists for the current commit.

## 13. Merge the pull request

**Purpose:** integrate the reviewed change into protected `main`.

**Best interface:** GitHub web **Squash and merge**, while learning.
**Alternatives:** VS Code task **Workflow: Merge PR**; GitHub Desktop after merge only for synchronization; terminal.

Confirm all six checks pass, the branch is current with `main`, and no commit followed final review.

Terminal:

```bash
title=$(rtk gh pr view PR_NUMBER --json title --jq .title)
rtk gh pr merge PR_NUMBER \
  --squash \
  --delete-branch \
  --subject "$title" \
  --body ""
```

Merging does not authorize production release.

## 14. Verify merge, staging, and complete Linear

**Purpose:** prove the delivered state and close the work record.

**Best interfaces:** GitHub web for merge/staging, Linear app for completion.
**Alternatives:** VS Code or GitHub Desktop to synchronize local `main`; terminal for all Git/GitHub verification.

Terminal:

```bash
rtk git switch main
rtk git pull --ff-only
rtk git status -sb
rtk git log -1 --oneline
rtk gh pr view PR_NUMBER --json state,mergedAt,mergeCommit
rtk gh run list --workflow "Deploy staging" --limit 5
```

Verify staging when the issue affects runtime behavior. Confirm every acceptance criterion is checked or was deliberately revised with an
explanation.

Linear completion comment:

```markdown
## Delivery complete

Pull request: PR_URL
Merge commit: `MERGE_SHA`
Merged at: YYYY-MM-DD
Staging verification: PASS, NOT_REQUIRED, or DETAILS

Acceptance criteria: all complete.
Follow-up issues: LINKS or `None`.
```

Then move `In Review → Done`.

## Recovery rules

- New commit after final review: repeat checks, preview as applicable, acceptance-criteria reconciliation, and final review.
- Failed check: return to implementation; do not approve or merge.
- `main` moved: update the branch, rerun checks, and repeat final review.
- Scope expansion: update or create a Linear issue before implementation.
- Incorrectly checked criterion: uncheck it immediately and record the missing evidence or work.
