---
# arggon:generated template="zcode/arggon/commands/arggon-done.md"
description: Close a finished item after verifying its gates
argument-hint: "<item-id>"
---

Close $ARGUMENTS following the done criteria:

1. Read the item with `mcp__arggon__arggon_show` (`body: true`) and verify every acceptance
   checkbox is honest and complete (tick the boxes in the file when the work is
   done).
2. Confirm the PR is merged (or the completing change is on the default branch)
   and the project gates pass; run `mcp__arggon__arggon_validate` and require `ok: true`.
3. Flip the item with `mcp__arggon__arggon_update` (`status: "done"`) — pass
   `no_cascade: true` when an administrative item must not auto-complete
   product containers.
4. Reap the merged worktree with `mcp__arggon__arggon_cleanup` (`prune: true`): it removes
   the worktree through the CLI's cleanup flow, deletes the merged branch and
   clears the item's `worktree_path` record. Run it without `prune` first to
   inspect the candidates; skipped entries name their reason.
5. If you are a maker subagent: stop at step 2 and report to the delivery lead.
   Completion is the delivery lead's call after merge.
