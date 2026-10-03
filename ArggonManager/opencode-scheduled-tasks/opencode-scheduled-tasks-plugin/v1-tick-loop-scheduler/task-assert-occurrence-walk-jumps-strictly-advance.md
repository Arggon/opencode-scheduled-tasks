---
type: task
status: in_progress
id: task-assert-occurrence-walk-jumps-strictly-advance
title: Nothing asserts the occurrence walk advances — a bad jump hangs the suite instead of failing it
assignee: arggon
branch: chore/task-assert-occurrence-walk-jumps-strictly-advance
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

### 2026-10-03 @ses_efff00ec8fferfO6SYYRbYBRR2
Branch `chore/task-assert-occurrence-walk-jumps-strictly-advance` @ 95b50d5. Test-only ledger over the existing walk, plus an in-loop refusal and step bound. 285 -> 289 tests, all green.

**The seam.** `traceOccurrenceWalk(spec, afterMs, timeZone, maxSteps)` returns `{ steps, result }` — every cursor move with its branch and both values, under a caller-chosen step budget. Test-only surface, kept out of the plugin's shape: the scheduler wants the answer, and a ledger on every production walk would allocate per step on the path spec 002 bounds. Budget is a step counter, never a clock — a stalled cursor is unbounded in wall-clock terms, so no clock can honestly bound it, and exceeding it throws rather than truncating.

**Not test-only.** Two things went inside `nextOccurrence`: `advanceCursor`, which refuses any move that does not advance, and a step bound defaulting to the horizon's length in minutes. These are in production on purpose. The stall guard is what turns the original hang into a red test *across all 289*, not just in the new ones; in `tick` a throw lands in `runTick`'s existing `.catch` as one logged failed tick. The bound is unreachable by a correct walk (every move advances ≥ 1 minute, so 2,635,200 minutes of horizon is 2,635,200 moves at most) — it is the floor behind the guard, not a new limit.

**How each branch is asserted.** Four, since the two `wall += MINUTE_MS` sites are written apart. 378 walks = 9 zones × 6 schedules × 7 seeds. Every step asserts `to > from` **and** `from === previous step's to` — the continuity half is load-bearing: without it a branch could move the cursor without recording the move and escape the assertion. The first step's `from` is checked against a seed computed in the test from the exported `wallParts`, so a test that re-derived the walk's frame could not agree with a broken walk by construction. Branch coverage is measured per zone (day/hour/minute in all nine), and the walk count is a literal so deleting a schedule fails. The `gap` branch is asserted separately against both transition fixtures: it fires once per *missing occurrence*, not per missing minute — the other 29 are walked by the minute branch, which cannot know they are missing.

**How termination fails rather than hangs.** Step budget, asserted as `toThrow(WalkTooLong)`. Two tests deliberately do *not* call unbounded `nextOccurrence` on an unsatisfiable spec: there the horizon alone can end the walk, and a test leaning on one structural fact to stop a loop it cannot interrupt is a test that can hang. The horizon's claim is discharged on the bounded walk (same code path) and the sweep proves the two entry points agree.

**Mutation check — the original defect.** Reintroducing the exact stray `+ zoneOffsetMs(afterMs, timeZone)` in the day jump: **4 red in 15–2146 ms, suite wall 37.9 s (green is 36 s) — no hang.** Two new tests plus two pre-existing ones that would previously have hung. Message names the branch and both values: `WalkStalled: the day branch moved the walk cursor to 1767213000000 from 1767213060000`. Hour jump non-advancing: 13 red, 13 ms. Minute move zero: 22 red, 21 ms. Gap move zero: 7 red, 17 ms. `while (wall < horizon)` -> `while (true)`: 3 red via `WalkTooLong` — the budget discharges acceptance box 3 behaviourally.

**The honest limit, measured.** Deleting `advanceCursor`'s throw leaves the suite **fully green** — no input can make a branch compute a non-advancing value, so the guard is proven by the mutants, not by a test, and a test reaching it would have to test a copy of the walk. That is why the step bound exists: **guard deleted + day-jump mutant applied together** — exactly the 700-second no-output run — finishes in 47.6 s with 4 red, slowest one existing test at 10.4 s (spinning out the full 2,635,200-step bound before throwing). Bounded, with an assertion and a diff, where it had neither.

**Untouched:** the p0's one-line seeding and `wallToNaive`/`naiveToWall` frame, the negative-offset matrix, `MAX_BACKLOG_SCAN` (still unexported, still a literal), the event-loop yield, README. One pre-existing test was rewritten in place — it was titled "returns undefined rather than looping forever" but asserted `toBeDefined()`; it now asserts the real claim (which is why the count moved by the 4 new tests only).

**Gates:** `npx tsc --noEmit` clean · `npx vitest run` 289 passed, finished · `npx tsx harness/smoke.ts` PASS · `arggon validate` ok · `arggon spec analyze` clean.

### handoff 2026-10-03 @ses_efff00ec8fferfO6SYYRbYBRR2 (session: ses_efff00ec8fferfO6SYYRbYBRR2) — next: Review @ 95b50d5, then merge. Re-run the sed mutants if the walk loop is touched again.
- branch: chore/task-assert-occurrence-walk-jumps-strictly-advance
- open questions: Is the in-loop WalkStalled/step-bound pair in nextOccurrence acceptable as production change, or should it be review-gated as new invariant? Guard removal is undetectable by tests.
