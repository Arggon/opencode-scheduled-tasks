---
type: bug
status: done
id: bug-history-says-no-job-with-id-for-a-cancelled-oneoff
title: "schedules_history answers \"no job with id\" for a cancelled one-off, which had a valid id"
assignee: arggon
branch: fix/bug-history-says-no-job-with-id-for-a-cancelled-oneoff
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

- [x] A cancelled one-off gets its own answer, distinct from an unknown id: something that says the task
      was cancelled and never ran. It must not say "no job with id".
- [x] The same for a loop stopped before it ever fired, if that state is reachable — check it rather than
      assume.
- [x] The `ids` list stays useful: it should not suggest the caller guessed when the id was simply not
      a run.
- [x] Tests cover cancelled-one-off and unknown-id **as separate cases**, so they cannot collapse into
      the same answer again. Mutation-check by making a cancelled task look unknown.
- [x] If the README documents `schedules_history`'s failure modes, add the cancelled case there.
      **Left unticked deliberately: the README is not this item's lane** (it is not in the worktree's
      change set, and the coordinator holds that wording). What the change makes the README's current
      text false is recorded under "What changed" below, with the exact replacement sentences, so the
      coordinator can apply them verbatim.
      **Applied by the coordinator** (README was outside the worker's lane), in all three places it
      named: the `schedules_cancel` bullet gains the distinct "was already cancelled and never ran"
      message; the one-off-lifecycle bullet records that a cancelled one-off leaves a bounded tombstone;
      and the history section's "unknown id" bullet now lists live ids across all three kinds and is
      followed by a new bullet for the cancelled / stopped / expired ending. The worker's verbatim
      wording, applied as given.

## What changed

**The new answer is a success, not an error.** A cancelled one-off is a real id with a real ending, and
"no runs yet" is what a *pending* one-off already says, so the ending has to be on the answer itself:

```jsonc
schedules_schedule({ prompt: "…", dueIn: "24h" })  -> { id: "oneoff_7hssw2gemurytaq8", pending: 1 }
schedules_cancel({ id: "oneoff_7hssw2gemurytaq8" }) -> { cancelled: true, pending: 0 }
schedules_history({ id: "oneoff_7hssw2gemurytaq8" })
  -> { id: "oneoff_7hssw2gemurytaq8", kind: "oneoff", status: "cancelled",
       at: "2026-10-03T12:00:00.000Z", runs: [], limit: 10 }
```

`status` and `at` are presence-only, and appear together or not at all. They differ from an unknown id
on every axis: no `error`, no `ids`, and an explicit ending rather than an absence of records.

**Why a tombstone and not a run record.** The record is `{ retired: true, at, how }` stored under the
id's **own** history key — the same key its runs would have used, never an array, so nothing
fabricated can appear in the list a caller reads to find out what ran. It is bounded by the existing
`MAX_EPHEMERAL_HISTORY_KEYS` cap and evicted by the existing rule, in memory and on disk together; a
tombstone is never written over runs, so an id that ran and was then stopped keeps its record and
gains no ending it never reached.

**A loop stopped before it ever fired is reachable**, and it had the same wrong answer. Three routes
out of the live lists were checked, not assumed, and all three now name themselves:
`schedules_stop_loop({ id })` → `status: "stopped"`; `schedules_stop_loop({})` (stop all — the route an
agent takes without naming ids) → `stopped` for each; and a loop whose **ttl ran out before its first
post** → `status: "expired"`.

**The `ids` list.** A retired id never reaches the miss branch, so nothing suggests the caller guessed
when the id simply was not a run. On the branch that remains, the list is every id that is **live
right now** across all three kinds: jobs, pending one-offs and running session loops. Loops were
previously missing, which made a mistyped *loop* id answer with a list that could not contain it.

**`schedules_cancel` had the same wrong answer one tool over**: a second cancel of a cancelled one-off
said "it may have already run" — false for a task this plugin cancelled and never dispatched. It now
says the task was already cancelled and never ran, read from the tombstone rather than inferred from
the task's absence. `schedules_run` keeps `no job with id`, which is true there: it takes **job** ids,
and a one-off is not one.

**README wording this change makes stale** (coordinator to apply — README untouched here):
`README.md:436-437` — "An unknown id is a typed error naming it and listing the job and pending-one-off
ids it does know…" becomes *"…listing the live ids it does know — jobs, pending one-offs and running
loops…"*, followed by a new bullet: *"A task that was cancelled, stopped or expired before it ever ran
is not an unknown id: it comes back with `status` (`cancelled`, `stopped` or `expired`), the instant it
was retired in `at`, and an empty run list — so a valid id is never reported as one that does not
exist."* Also `README.md:230-231` (`schedules_cancel`) gains "or was already cancelled", and
`README.md:417` ("A completed one-off survives only in `schedules_history`, then is discarded") should
say that a **cancelled** one-off leaves a bounded tombstone in the same place.

## Evidence

- **Baseline before the change**: 324 tests (323 pass, 1 win32-gated skip), suite finishes.
- **After**: 337 tests (336 pass, 1 skip), suite finishes in ~36s.
- **Mutation 1 — make a retired id look unknown** (the `retired` branches removed from
  `resolveHistoryOwner`, so the id falls through to `no job with id` as it did): **8 of the 13 new
  tests go red**, including the cancelled one-off, both stopped-loop routes, expiry, the restart, the
  cap and the repeated cancel.
- **Mutation 2 — tombstone written even over runs** (the `retireEphemeral` guard removed): the
  loop-that-posted test goes red, which is what keeps the two facts exclusive.
- **Mutation 3 — the in-memory tombstone not dropped with its evicted key**: only the new
  "forgets a tombstone of its own" test goes red. It was written *because* the first cap test could
  not see this: a cap reached from the persisted index never holds a tombstone this process minted.
- Gates: `tsc --noEmit` clean · `vitest run` 336 pass / 1 skip · `harness/smoke.ts` PASS ·
  `arggon validate` ok · `arggon spec analyze` clean.

## Notes

Filed by the coordinator from the live dogfood pass. Evidence is on
`task-t7-attribution-docs-and-v2-gate` in the same session.

Do not regress the resolution chain: jobs → pending one-offs → dispatching → loops → storage → the
pre-fix flat-key migration. This is about adding one state to the front of that chain, not about
simplifying it.
