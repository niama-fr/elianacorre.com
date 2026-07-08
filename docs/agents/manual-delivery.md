# Manual delivery runbook

Use this runbook for the normal `elianacorre.com` delivery loop. It favors the tools Grégory uses day to day:

- Linear App for issue state and acceptance criteria.
- GitHub Desktop for branch, commit, push, and pull-request creation.
- Codex for implementation help, PR text, evidence comments, and standards/spec review.
- GitHub Web for checks, squash merge, production approval, and staging evidence.
- Terminal only as a precise fallback, always through RTK.

GitHub Desktop creates a normal open pull request, not a draft. That is acceptable after the branch is committed and pushed. Do not treat an open PR as merge-ready until acceptance criteria are reconciled, checks pass, and final review is recorded.

## Workflow

| Step | Preferred way | Ask Codex | VS Code task | Terminal fallback |
| --- | --- | --- | --- | --- |
| 1. Create or refine the Linear issue | Linear App | `Create/refine a Ready Linear issue for this work.` | None | None; use Linear |
| 2. Assign yourself and start work | Linear App | `Start NIA-123 and keep the workflow state current.` | `Workflow: Open current Linear issue` | None; use Linear |
| 3. Create the issue branch | GitHub Desktop | `Create the NIA-123 issue branch from origin/main with no upstream.` | `Workflow: Start issue branch` | `rtk git fetch origin main && rtk git switch --no-track -c NIA-123/short-description origin/main` |
| 4. Implement | VS Code and Codex | `Implement NIA-123 within scope.` | None | `rtk git status -sb`, `rtk git diff --stat`, `rtk git diff` |
| 5. Verify locally | VS Code task | `Run the focused verification needed for NIA-123.` | `Workflow: Verify all` | See [Verification](verification.md) |
| 6. Commit | GitHub Desktop | `Review the staged files and suggest the commit message for NIA-123.` | None | `rtk git add FILES && rtk git diff --cached --check && rtk git commit -m "NIA-123: Meaningful outcome"` |
| 7. Publish/push | GitHub Desktop | `Check whether this branch is safe to publish.` | None | `rtk git push -u origin NIA-123/short-description` |
| 8. Open the PR | GitHub Desktop | `Fill the pull-request template for NIA-123.` | `Workflow: Open current PR` after creation | `rtk gh pr create --base main --head NIA-123/short-description --title "NIA-123: Meaningful outcome"` |
| 9. Link PR and reconcile criteria | Linear App, with Codex evidence | `Link PR #N to NIA-123 and reconcile objective acceptance criteria.` | `Workflow: Open current Linear issue` | None for Linear updates |
| 10. Move to In Review | Linear App | `Move NIA-123 to In Review if implementation is complete.` | None | None; use Linear |
| 11. Watch checks | GitHub Web | `Summarize the current PR checks for PR #N.` | `Workflow: Watch current PR checks` | `rtk gh pr checks PR_NUMBER --watch --interval 10` |
| 12. Final review | Codex, then GitHub PR comment | `Make a final standards/spec review before I merge PR #N.` | None | `rtk git diff main...HEAD --check && rtk gh pr checks PR_NUMBER` |
| 13. Squash and merge | GitHub Web | `Tell me whether PR #N is ready to squash and merge.` | None | `rtk gh pr merge PR_NUMBER --squash --delete-branch --subject "NIA-123: Meaningful outcome" --body ""` |
| 14. Complete Linear | Linear App | `Write the delivery-complete Linear comment for NIA-123.` | `Workflow: Open current Linear issue` | None; use Linear |

## Pull-request description

Use the repository template and fill it literally:

```markdown
## Linear

- Issue: NIA-123

## Outcome

Describe the delivered user-visible, operational, or documentation outcome.

## Verification

- [ ] `bun run test`
- [ ] `bun run typecheck`
- [ ] `bun run check`
- [ ] `bun run build`
- [ ] Codex reviewed the final diff against repository standards and the Linear issue
```

Leave a box unchecked until that exact evidence exists. For docs-only changes, add any extra checks below the template, such as `rtk git diff --check` or link validation.

## Acceptance criteria

Before `In Review`:

1. Compare every Linear checkbox with the final implementation and verification evidence.
2. Check objective criteria proven by tests, checks, builds, docs, or code inspection.
3. Leave human-judgment criteria unchecked until Grégory validates them.
4. Comment with PR URL, commit SHA, verification evidence, checked criteria, and any pending human validation.
5. Do not move to `In Review` if an unchecked criterion means missing implementation.

## Final review

Final review is separate from CI. It happens after the final commit and before merge.

Ask Codex:

> Make a final standards/spec review before I merge PR #N.

The review must cover:

- **Standards:** repository conventions, architecture, generated-file boundaries, security, unrelated changes, and verification evidence.
- **Spec:** Linear acceptance criteria, exclusions, missing requirements, and unapproved scope.

Any commit after final review invalidates the review. Rerun checks and repeat the review before approving.

## Completion

After squash merge:

1. Confirm the merge commit in GitHub Web.
2. Confirm staging when the issue affects runtime behavior.
3. Add a Linear delivery-complete comment:

```markdown
## Delivery complete

Pull request: PR_URL Merge commit: `MERGE_SHA` Merged at: YYYY-MM-DD Staging verification: PASS, NOT_REQUIRED, or DETAILS

Acceptance criteria: all complete. Follow-up issues: LINKS or `None`.
```

4. Move `In Review → Done`.

## Recovery

- Branch shows it will push to `main`: unset the upstream, then publish the branch. `rtk git branch --unset-upstream`
- Check fails: fix on the same branch, push again, and repeat affected verification.
- New commit after final review: repeat checks, acceptance-criteria reconciliation, and final review.
- Scope expands: update the Linear issue or create a new one before implementation.
- Wrong criterion checked: uncheck it and comment with the missing evidence or work.
