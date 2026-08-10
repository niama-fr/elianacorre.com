---
name: resolving-merge-conflicts
description: Use when you need to resolve an in-progress git merge/rebase conflict while preserving this repository's human-owned commit boundary.
---

# Resolving merge conflicts

1. Inspect the current merge or rebase state, git history, and conflicting files.

2. Find the primary sources for each conflict. Understand why each side changed and what its original intent was. Read relevant commit messages, pull requests, issues, specifications, ADRs, or domain documentation as needed.

3. Resolve each conflict hunk by intent:

   * preserve both intents where compatible;
   * where they are incompatible, choose the result that matches the delegated work and repository decisions;
   * surface meaningful trade-offs;
   * do not invent unrelated behaviour.

4. Run focused automated checks needed to establish that the conflict resolution is coherent. Do not run the repository's complete final verification suite unless explicitly delegated.

5. Stage the resolved conflict files when staging is required to mark them resolved.

6. Stop before any operation that creates, rewrites, or publishes commits unless that operation was explicitly delegated.

This includes:

* `git commit`;
* `git merge --continue` when it creates a merge commit;
* `git rebase --continue`;
* `git cherry-pick --continue`;
* pushes or force-pushes.

At handoff, report:

* which conflicts were resolved;
* any intent trade-offs made;
* focused verification performed;
* the exact Git continuation step still required from the human.

Do not abort an in-progress merge or rebase unless explicitly requested.
