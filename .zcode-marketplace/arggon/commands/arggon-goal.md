---
# arggon:generated template="zcode/arggon/commands/arggon-goal.md"
description: Render the goal-mode contract for one claimed item (objective + verification + boundaries)
argument-hint: "<item-id>"
---

Start a ZCode Goal Mode loop on $ARGUMENTS, following the ArggonManager rules.

1. Confirm the item is claimable and read its acceptance checklist
   (`mcp__arggon__arggon_show` with `meta: true`, then with `body: true`);
   never steal a claim and never reopen `done`/`cancelled`.
2. Claim it through `mcp__arggon__arggon_start` with `id`, `assignee` and
   `worktree: true` — the claim is what creates the worktree and records
   `branch` + `worktree_path`; do the rest from the worktree path the start
   result names (never a `../<repo>-<id>` guess).
3. From that worktree, render the contract with the headless bin
   (`arggon goal <item-id>`; `arggon goal <item-id> --json` for the structured
   form). It refuses an unresolvable caller identity, a foreign claim, a closed
   item and any run outside the item's own worktree — read the refusal, never
   route around it.
4. Feed the rendered contract to Goal Mode as the loop's objective and
   verification contract. One goal per claimed item: the objective is the item's
   next unchecked acceptance criterion, read from the kernel's one acceptance
   grammar over the item's canonical body — the same rows `done` is gated on, so
   if the contract says the checklist is satisfied there is nothing to loop on —
   the contract carries the boundaries, and never start a second goal for a
   sibling item, never enter another item's worktree, and never loop while a
   reviewer dispatch is in flight (that window is read-only).
5. Report the item id, the objective line and the worktree path when the loop
   starts, so the delivery lead can follow the claim.
