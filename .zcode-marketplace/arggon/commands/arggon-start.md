---
# arggon:generated template="zcode/arggon/commands/arggon-start.md"
description: Claim an item and start work in its own git worktree
argument-hint: "<item-id>"
---

Start work on $ARGUMENTS following the ArggonManager rules:

1. Resolve the item id and confirm it is claimable (`mcp__arggon__arggon_next` /
   `mcp__arggon__arggon_show`); never steal a claim and never reopen `done`/`cancelled`.
2. Claim it and create its worktree through the native tool: `mcp__arggon__arggon_start`
   with `id` and `assignee` (add `worktree: true` for the linked worktree at
   `../<repo>-<id>`; it is prepared before the claim commit and kept on
   failure). The tool records the branch and `worktree_path` on the item.
3. Publish and open the draft PR as explicit steps — they are not part of the
   tool: push the branch (`git push -u origin <branch>` from the worktree),
   then `gh pr create --draft --base <base>` with the item id in the title/body.
4. Do all later work at the worktree path from the start result (or
   `mcp__arggon__arggon_show` with `meta: true`) — every command and edit runs there, and
   the canonical checkout stays untouched.
5. Load the `arggon-cli` skill if it is not loaded, then report the branch, the
   worktree path and the item id.
