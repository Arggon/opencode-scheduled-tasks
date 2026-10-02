---
# arggon:generated template="opencode/commands/arggon-done.md"
description: Close a finished item after verifying its gates
agent: arggon-coordinator
---

Close $ARGUMENTS following the done criteria:

1. Read the item with `tools.arggon.show({ id, body: true })` and verify every
   acceptance checkbox is honest and complete (tick the boxes in the file when
   the work is done).
2. Confirm the PR is merged (or the completing change is on the default branch)
   and the project gates pass; run `tools.arggon.validate({})` and require
   `ok: true`.
3. Flip the item with `tools.arggon.update({ id, status: "done" })` — pass
   `{ no_cascade: true }` when an administrative item must not auto-complete
   product containers.
4. Reap the merged worktree with `tools.arggon.cleanup({ prune: true })`: it
   removes the worktree through the OpenCode worktree domain, deletes the
   merged branch and clears the item's `worktree_path` record. Run it without
   `prune` first to inspect the candidates; skipped entries name their reason.
5. If you are a worker subagent: stop at step 2 and report to the coordinator.
   Completion is the coordinator's call after merge.
