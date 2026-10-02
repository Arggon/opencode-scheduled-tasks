---
# arggon:generated template="opencode/commands/arggon-start.md"
description: Claim an item and start work in its own git worktree
---

Start work on $ARGUMENTS following the ArggonManager rules:

1. Resolve the item id and confirm it is claimable (`tools.arggon.next` /
   `tools.arggon.show`); never steal a claim and never reopen `done`/`cancelled`.
2. Claim it and create its worktree through the native tool:
   `tools.arggon.start({ id, assignee: "<login>" })`. It records the branch and
   `worktree_path`, creates `../<repo>-<id>` through the OpenCode worktree
   domain and commits the claim inside the worktree (the canonical checkout
   stays untouched). Pass `{ worktree: false }` for a branch-only start.
3. Publish and open the draft PR as explicit steps — they are not part of the
   tool: push the branch (`git push -u origin <branch>`), then
   `gh pr create --draft --base <base>` with the item id in the title/body.
4. Move this session into the worktree: read `worktreePath` from the start
   result (or `tools.arggon.show({ id, meta: true })`) and call the `opencode`
   `session_move` tool — so every later command runs there.
5. Load the `arggon-cli` skill if it is not loaded, then report the branch, the
   worktree path and the item id.
