---
type: task
status: todo
id: task-tick-drain-order-oneoffs-before-loops
title: Drain order lets a recurring loop starve a one-off at the concurrency cap
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
priority: p2
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [bug-schedules-run-not-bounded-capped-or-leased]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/task-tick-drain-order-oneoffs-before-loops.md
  Leaves live only under a story. id is the filename stem: task-tick-drain-order-oneoffs-before-loops.
  CLI `arggon create task tick-drain-order-oneoffs-before-loops` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Drain order lets a recurring loop starve a one-off at the concurrency cap

## Context

Surfaced by the worker that fixed `bug-loop-stop-does-not-persist-and-concurrency-bypass`, and left
alone deliberately as a policy call.

That fix gave all three drains **one shared per-tick budget** (`claimed`, seeded from
`state.inFlight.size + decisions.length`), which is the right call and stops either ephemeral drain
spending a full budget alone. It kept the **pre-existing order**: recurring jobs, then loops, then
one-offs.

At `maxConcurrentRuns: 1` with a loop due every minute and a one-off pending, the loop takes the slot
and the one-off is spent as `outcome: "skipped"` — permanently, since a skipped one-off is consumed
by design. A user who asked for a specific task at a specific time loses it to a recurring one,
silently.

## Decision (coordinator — do not re-open this)

**One-offs drain before loops.** Specific beats recurring: a loop is an indefinite, repeating
request and is never urgent in the same way a user-stated instant is. It also aligns with ADR 0006,
which keeps recurring *jobs* file-only and treats ephemeral work as the exception — within the
ephemeral drains, the least-repeating intent should win the scarce slot.

## Acceptance

- [ ] The tick drains one-offs before loops, with a comment recording the specific-beats-recurring
      rule and the ADR 0006 reasoning above.
- [ ] The shared `claimed` budget still spans all three drains, and a loop can no longer consume a
      slot a pending one-off needed.
- [ ] A test pins it: at `maxConcurrentRuns: 1`, with one due loop and one due one-off, the **one-off
      runs** and the loop is recorded as `skipped`. Mutation-check it — invert the drain order and
      confirm the test fails.
- [ ] The log line for the skipped loop is clear that it lost the slot to a one-off, not to another
      loop.

## Notes

Filed by the coordinator from the loop-fix worker's report. P2: it is a fairness wart with a small
diff, not a correctness hole — the cap is respected either way. Sequence it **after**
`bug-run-timeout-never-enforced`, since that fix also rewrites the tick's run path.
