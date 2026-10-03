---
type: task
status: in_progress
id: task-assert-occurrence-walk-jumps-strictly-advance
title: Nothing asserts the occurrence walk advances — a bad jump hangs the suite instead of failing it
assignee: arggon
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-03"
updated: "2026-10-03"
claimed_at: "2026-10-03T04:39:07.899Z"
depends_on: [bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-assert-occurrence-walk-jumps-strictly-advance.md
  Leaves live only under a story. id is the filename stem: task-assert-occurrence-walk-jumps-strictly-advance.
  CLI `arggon create task assert-occurrence-walk-jumps-strictly-advance` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Nothing asserts the occurrence walk advances — a bad jump hangs the suite instead of failing it

## Context

Raised as an open question by the worker that fixed
`bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc`: a mutant in the day/hour **jump**
branches **hangs the suite** rather than failing an assertion, and **nothing asserts that each jump
strictly advances**.

**This is not theoretical. It happened in this session.** The worker before that one was cancelled
mid-task and left a stray `+ zoneOffsetMs(afterMs, timeZone)` in the day-jump branch. In New York that
made the jump land on the previous evening, whose day does not match either — so `wall` returned to the
identical value and `nextOccurrence` **never returned**. The visible symptom was a `vitest run` that
printed its banner and then produced **no output at all across 700 seconds**. I could not tell from the
outside whether that was output buffering or a hang; both readings were plausible, and the hang was the
real one.

A hang is a materially worse failure mode than a red test:

- **CI hangs instead of failing.** The job has to be killed by a timeout, and the log carries no
  assertion, no diff and no indication of which test is responsible.
- **It is indistinguishable from slow.** My first instinct was that a 700-second run with no output was
  probably buffering. Only going and looking distinguished the two.
- It cost real time on the highest-priority item in the tracker.

The walk has three cursor-advancing moves: the day jump, the hour jump, and `wall += MINUTE_MS`. Any of
them can compute a value that fails to advance, and today nothing would notice.

## Acceptance

- [ ] Each of the three cursor-advancing branches is asserted to **strictly advance** — the next value
      must be greater than the current one, for every branch, not only in the happy path.
- [ ] A test asserts **termination**: for a spec and zone that cannot match, `nextOccurrence` returns
      `undefined` within a bounded number of steps. This is the assertion that would have caught the
      stray `zoneOffsetMs`, and it must fail loudly rather than hang — so bound it with a step counter,
      not a wall-clock timeout.
- [ ] The horizon is likewise asserted to terminate the walk rather than relied upon structurally.
- [ ] **Mutation-check it**: reintroduce the non-advancing jump and confirm the new tests go **red**.
      If they hang instead of failing, the test is wrong — that is the whole point of this item, so
      design them to fail.
- [ ] Decide whether the step counter should be observable in test code at all (an optional bound
      parameter, or an exported pure helper). If you add one, say whether it is test-only surface, and
      keep it out of the plugin's public shape unless there is a case for it.

## Notes

Filed by the coordinator, p1. The worker that raised it correctly declined to grow the p0's diff into
this; sequencing it separately is the right call, and the p0 has landed.

**Do not regress** anything from the p0: the cursor now walks the target zone's wall parts
(`wallToNaive`/`naiveToWall`), the negative-offset test matrix exists and must stay green, and the gap
policy (skip a non-existent wall time) plus overlap policy (fire once, at the first instant) are
documented at `wallToInstant` and committed in spec 001 boxes 131/133.

Note for whoever picks this up: a test that can hang the suite is worse than no test, so the assertions
here must be written to *fail* on the bad case. If you find yourself reaching for a wall-clock timeout
to bound a walk, use a step counter instead.
