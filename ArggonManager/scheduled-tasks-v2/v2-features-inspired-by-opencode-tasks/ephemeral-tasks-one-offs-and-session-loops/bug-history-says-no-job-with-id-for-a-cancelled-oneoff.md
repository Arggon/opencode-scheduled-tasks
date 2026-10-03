---
type: bug
status: todo
id: bug-history-says-no-job-with-id-for-a-cancelled-oneoff
title: "schedules_history answers \"no job with id\" for a cancelled one-off, which had a valid id"
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
priority: p3
created: "2026-10-03"
updated: "2026-10-03"
depends_on: [task-assert-v1-identical-with-no-markdown-dir]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/bug-history-says-no-job-with-id-for-a-cancelled-oneoff.md
  Leaves live only under a story. id is the filename stem: bug-history-says-no-job-with-id-for-a-cancelled-oneoff.
  CLI `arggon create bug history-says-no-job-with-id-for-a-cancelled-oneoff` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# schedules_history answers "no job with id" for a cancelled one-off, which had a valid id

## Context

Found by the coordinator running the README dogfood pass against the live deployed build, on the real
host rather than under a fake `ctx`.

```
schedules_schedule({ prompt: "…", dueIn: "24h" })  -> { id: "oneoff_7hssw2gemurytaq8", pending: 1 }
schedules_cancel({ id: "oneoff_7hssw2gemurytaq8" }) -> { cancelled: true, pending: 0 }
schedules_history({ id: "oneoff_7hssw2gemurytaq8" })
  -> { error: 'no job with id "oneoff_7hssw2gemurytaq8"', ids: ["dogfood-smoke"] }
```

The id was **valid**. It named a one-off that was created and then cancelled, so it never ran and has no
history. The message says "no job with id", which tells the caller they got the id wrong — the exact
conclusion a user draws, and the wrong one.

`resolveHistoryOwner` is otherwise careful about exactly this distinction. It already separates:

- **pending** (in `state.oneOffs`) — "nothing has run yet, and that is a real answer"
- **dispatching** — "running right now, and the outcome is not written yet"
- **finished** — found via storage, because it is in no live list
- **unknown**

A **cancelled** one-off is a fifth state with no answer, and it falls through to "unknown". The
discriminating work is already done for the other four; this one was not on the list.

## Why p3

It is a message, not a fault: nothing is lost, nothing misbehaves, and the cap and recording are correct.
But it is a **reachable state reported inaccurately**, which is the class of defect this tracker has
repeatedly been right to file — and the alternative is losing the finding because it is small.

## Acceptance

- [ ] A cancelled one-off gets its own answer, distinct from an unknown id: something that says the task
      was cancelled and never ran. It must not say "no job with id".
- [ ] The same for a loop stopped before it ever fired, if that state is reachable — check it rather than
      assume.
- [ ] The `ids` list stays useful: it should not suggest the caller guessed when the id was simply not
      a run.
- [ ] Tests cover cancelled-one-off and unknown-id **as separate cases**, so they cannot collapse into
      the same answer again. Mutation-check by making a cancelled task look unknown.
- [ ] If the README documents `schedules_history`'s failure modes, add the cancelled case there.

## Notes

Filed by the coordinator from the live dogfood pass. Evidence is on
`task-t7-attribution-docs-and-v2-gate` in the same session.

Do not regress the resolution chain: jobs → pending one-offs → dispatching → loops → storage → the
pre-fix flat-key migration. This is about adding one state to the front of that chain, not about
simplifying it.
