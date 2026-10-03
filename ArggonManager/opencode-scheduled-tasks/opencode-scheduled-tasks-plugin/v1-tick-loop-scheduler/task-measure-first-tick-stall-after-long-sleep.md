---
type: task
status: in_progress
id: task-measure-first-tick-stall-after-long-sleep
title: "A long sleep may stall the first tick for seconds at 100 jobs — measure, then decide"
assignee: arggon
branch: chore/task-measure-first-tick-stall-after-long-sleep
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-02"
updated: "2026-10-03"
claimed_at: "2026-10-03T00:57:20.559Z"
depends_on: [bug-log-lines-before-first-lease-never-reach-the-file]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-measure-first-tick-stall-after-long-sleep.md
  Leaves live only under a story. id is the filename stem: task-measure-first-tick-stall-after-long-sleep.
  CLI `arggon create task measure-first-tick-stall-after-long-sleep` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# A long sleep may stall the first tick for seconds at 100 jobs — measure, then decide

## Context

Raised as an **open question** by the worker that closed `bug-tick-cost-grows-with-sleep-not-with-jobs`,
and filed here rather than left to die in a report.

The backlog walk is now bounded and measured: one job's `MAX_BACKLOG_SCAN` walk costs exactly **6012
timezone lookups (~23 ms)**, paid **once** — the tick that finds the backlog consumes the window, and a
`backfill` remainder moves into the durable `catchUp` plan. The next ordinary tick costs one
occurrence search (~0.07 ms), and a later tick over 100 such jobs ~6 ms.

The worker's own caveat, quoted: aggregate at 100 jobs is **~2.34 s once**, then ~6 ms/tick — *"it's
linear and once, but it's a ~2.3 s stall on the first tick after a long sleep"*. And it explicitly
flagged its own uncertainty: it did **not** verify whether the tick yields to the event loop
mid-loop, so **"blocked" may be an overstatement**.

That uncertainty is the reason this is a task rather than a bug. It could be a real multi-second
event-loop stall on the first tick after a laptop sleeps — which would be user-visible as an OpenCode
freeze — or it could be a 2.3 s CPU cost spread across microtasks that nobody ever notices. The
measurement decides, and it has not been made.

## Acceptance

- [ ] **Measure it first.** Wall-clock duration of the first tick after a long sleep, at a realistic
      job count (1, 10, 100), with the event loop instrumented so it is clear whether the loop is
      *blocked* (no other work runs) or merely *busy* (yields between iterations). Do not infer one
      from the other.
- [ ] Report the number before changing anything. If it is already acceptable, say so with the
      measurement and close the task — that is a legitimate outcome, and manufacturing an
      optimisation to look thorough is not one.
- [ ] If it *is* a real stall: decide between yielding to the event loop between jobs, lowering the
      per-job bound, or amortising the walk across ticks the way `catchUp` already amortises replay.
      Whichever you pick, `droppedCapped` must keep meaning "lower bound", and the count reported must
      still agree with the instants it is reported beside — a count that disagrees with the
      occurrences is the ADR 0002 failure this repo exists to catch.
- [ ] Whatever the answer, the number and the method go in the comment on
      `bug-tick-cost-grows-with-sleep-not-with-jobs`, which is where the measurements live.

## Notes

Filed by the coordinator from the tick-cost worker's report. p2 and **not** a bug: the cost is bounded,
linear, and paid once. The open question is whether a bounded 2.3 s of work is also a visible stall,
and nobody has looked.

**Do not disturb** `MAX_BACKLOG_SCAN`'s export decision (keep it unexported, assert the literal) or the
`catchUp` plan. Both were argued and are covered.
