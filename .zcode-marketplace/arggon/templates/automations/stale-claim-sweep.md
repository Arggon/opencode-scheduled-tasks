---
# arggon:generated template="zcode/arggon/templates/automations/stale-claim-sweep.md"
name: arggon-stale-claim-sweep
description: OPT-IN weekly stale-claim sweep — a read-only `arggon list --stale` pass over the tracker that files one re-claim-or-release finding per abandoned claim via `arggon create`. Nothing is scheduled or runs until the adopter wires this contract into their own scheduler; this file is the contract, not a running job.
---

# Weekly stale-claim sweep (opt-in)

Cadence: **weekly** (default threshold 7d). This is an opt-in automation:
`arggon init` only vendors this contract — it schedules nothing and runs
nothing. To adopt it, wire this file into your own scheduler (cron, CI timer,
agent loop) at the cadence you chose; to decline, ignore or delete the file.
Deleting it is the off switch.

## Preconditions — claim and branch (hold or refuse to run)

Refuse to run (and say why in the run log) unless ALL hold:

1. **No claim held.** The sweep is nobody's item work: it holds no
   `arggon start` claim, runs inside no item's `worktree_path`, and never
   claims, branches or checks out anything (`git branch`/`git checkout`/
   `git switch` are forbidden to it).
2. **Primary checkout, default branch.** It runs from the primary checkout on
   the default branch with a **clean tree** (`git status --porcelain` empty).
   Filing appends the tracker's auto-commit, and that commit must never land
   on an item's feature branch.
3. **Read-only budget.** The sweep itself is a pure read. The ONLY write it may
   ever make is `arggon create` in the filing step.

## Scan — read-only steps, in order

1. `arggon validate --json` — refuse to file anything if it errors; a broken
   tracker is itself the first finding, reported, not fixed.
2. `arggon list --stale --older-than 7d --json` — every claimed item whose
   `claimed_at` lease is older than the threshold (claims from before
   `claimed_at` count as stale). Tune `--older-than` to your team's lease, not
   below 24h.
3. For each hit, `arggon show <id> --meta --json` — read-only context: the
   assignee, `claimed_at`, `branch` and `worktree_path` that go into the
   finding. Never run the sweep as the assignee's identity.

## Filing — `arggon create` only

- File ONE task per stale claim, deduplicated: skip when an open finding for
  the same claim already exists (`arggon list --json` filtered on the claim's
  story; the finding title carries the stale id). Cap the run (10 findings)
  and say so when the cap binds.
- File with
  `arggon create task "Sweep: re-claim or release <stale-id>" --parent <stale item's parent story>` — unassigned, status todo — then
  `arggon comment <new-id>` with the evidence: the stale item id, its
  assignee, `claimed_at`, branch and worktree path, and the threshold used.
- NEVER touch the stale item itself: no `arggon update` (a sweep never
  reassigns, unassigns or closes another identity's claim — releasing a claim
  is the assignee's or the lead's decision), no `arggon comment` on it, no
  `arggon start`. Never `git commit`/`push` by hand — the tracker auto-commit
  of `arggon create` is the whole write surface.
- The kernel stays the enforcement of record: this contract is a prompt, and
  the claim/steal/reopen invariants outrank it.
