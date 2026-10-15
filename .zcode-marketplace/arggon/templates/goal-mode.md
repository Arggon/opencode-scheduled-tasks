---
# arggon:generated template="zcode/arggon/templates/goal-mode.md"
name: arggon-goal-mode
description: ArggonManager goal-mode contract for ONE claimed item — objective and verification derived from that item's acceptance checklist, never hand-written. Instantiate with `arggon goal <item-id>` (the /arggon-goal command); this file is the shape, the CLI fills the slots and appends the hard boundaries.
---

# Arggon goal mode — {{ITEM_ID}}

ZCode Goal Mode loops **plan → execute → verify**. This contract is the
ArggonManager half of that loop. It is derived per item by
`arggon goal {{ITEM_ID}}` from the item's acceptance checklist in git: the
`{{...}}` slots below are filled from `arggon show {{ITEM_ID}} --body`, never
typed by hand and never edited after rendering. Re-run the command after any
checklist edit — the checklist in git is the only source of truth, this file
is only the shape.

Whether any work remains is NOT this file's call and not the loop's: it comes from
the kernel's one acceptance grammar — the same rows, read from the same canonical
item body, that refuse `arggon update --status done` while a criterion is
unchecked (which lines count as a criterion is documented in
`ArggonManager/docs/convention.md` §Acceptance rows). So the objective below can
never say "nothing left" on an item the gate still refuses to close. Read it as
authoritative and re-run `arggon goal {{ITEM_ID}}` whenever it disagrees with your
read.

## Objective (exactly one)

{{GOAL_OBJECTIVE}}

## Verification contract — how the loop knows the goal is met

{{GOAL_VERIFICATION}}

## The loop

1. **plan** — read the item, the review bar (`ArggonManager/docs/agents.md`)
   and the repo gates; plan against the objective above and nothing else.
2. **execute** — work only inside {{WORKTREE_PATH}} on {{BRANCH}}; commit
   there with explicit paths and keep `arggon validate` green.
3. **verify** — run the verification contract; a plan that cannot show every
   line passing is re-planned, not declared done.

## Boundaries and refusals (appended by the CLI)

`arggon goal` appends the hard boundaries and the refusal cases to the rendered
contract — it never reads them from this file, so editing this template cannot
drop them. Read them in the rendered contract: they name the kernel as the
enforcement of record (`arggon validate`, the claim lease, the done gate) and
the reviewer dispatch's read-only window as a boundary the loop never crosses.
