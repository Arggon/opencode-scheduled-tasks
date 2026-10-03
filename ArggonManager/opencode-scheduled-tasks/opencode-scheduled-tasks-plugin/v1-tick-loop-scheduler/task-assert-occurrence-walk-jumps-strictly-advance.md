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

- [x] Each of the three cursor-advancing branches is asserted to **strictly advance** — the next value
      must be greater than the current one, for every branch, not only in the happy path.
      Four branches (the two `wall += MINUTE_MS` sites are written apart, so they are asserted apart),
      read off a cursor trace: 378 walks over the offset matrix × 6 schedules × 7 seeds, and each
      step asserts `to > from` **and** `from === the previous step's to` — the continuity half is what
      stops a branch escaping the assertion by moving the cursor without recording the move.
- [x] A test asserts **termination**: for a spec and zone that cannot match, `nextOccurrence` returns
      `undefined` within a bounded number of steps. This is the assertion that would have caught the
      stray `zoneOffsetMs`, and it must fail loudly rather than hang — so bound it with a step counter,
      not a wall-clock timeout.
      `parseCron` refuses every unsatisfiable schedule (`0 0 31 4 *` is a `CronError`), so the spec is
      hand-built with an empty field — which is itself asserted, so the hand-building is necessary
      rather than lazy. Bounded by `maxSteps`, never a clock.
- [x] The horizon is likewise asserted to terminate the walk rather than relied upon structurally.
      As arithmetic on the seed, not a loop invariant: the last move starts before
      `seed + 5·366 days` and ends at or after it, overshooting by under a day; 1830–1831 day-jumps;
      and exactly 2 635 200 minute-moves for the same horizon walked at minute granularity.
- [x] **Mutation-check it**: reintroduce the non-advancing jump and confirm the new tests go **red**.
      If they hang instead of failing, the test is wrong — that is the whole point of this item, so
      design them to fail.
      All six mutations red, none hung; see the evidence section below.
- [x] Decide whether the step counter should be observable in test code at all (an optional bound
      parameter, or an exported pure helper). If you add one, say whether it is test-only surface, and
      keep it out of the plugin's public shape unless there is a case for it.
      **Two additions, and they are not the same kind of thing.** `traceOccurrenceWalk` is test-only
      surface, kept out of the plugin's shape (the scheduler wants the answer; the ledger would
      allocate per step on the path spec 002 bounds). `advanceCursor`'s `WalkStalled` and the walk's
      step bound are **not** test-only: they are in `nextOccurrence` itself, because the alternative
      is that a bad branch hangs the scheduler, not just the suite.

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

## Evidence (worker, 2026-10-03)

`src/index.ts` gained `advanceCursor` — the one place a cursor move is recorded, so "every move
advances" is a single assertion no branch can route around — plus the walk's own step bound, both
inside `nextOccurrence`'s loop. `traceOccurrenceWalk` is the test-only ledger over the same
`walkFrom`. **The p0's one-line seeding and the `wallToNaive`/`naiveToWall` frame are untouched.**

### Mutation check — the point of the item

`sed` in each mutant, `npx vitest run`, source restored after each. Baseline suite: 289 passing in
~36 s. **No mutation hung; every one finished in about the same wall time as green.**

| Mutation | Failed | Slowest failing test | Failure mode |
| --- | --- | --- | --- |
| day jump `+ zoneOffsetMs(afterMs, timeZone)` — **the original hang** | 4 | 15 ms | `WalkStalled: the day branch moved the walk cursor to … from …` |
| hour jump `parts.hour + 1` -> `parts.hour` | 13 | 13 ms | `WalkStalled: the hour branch …` |
| minute move `wall + MINUTE_MS` -> `wall` | 22 | 21 ms | `WalkStalled: the minute branch …` |
| gap move `wall + MINUTE_MS` -> `wall` | 7 | 17 ms | `WalkStalled: the gap branch …` |
| `while (wall < horizon)` -> `while (true)` | 3 | 655 ms | `WalkTooLong: the walk spent its budget of 10000 steps` |
| `advanceCursor`'s `throw` deleted | **0** | — | suite stayed green — see below |

Two of these are worth reading twice.

**The day-jump mutant is what this item was filed for, and it is now four red tests in
milliseconds.** Two are new; the other two are pre-existing tests that would have hung. The
`WalkStalled` message names the branch and both values, so the failure says which edit to look for.

**The last row is the honest limit.** Deleting the guard changes nothing observable on a green suite,
because no input can make a branch compute a non-advancing value — so the guard is proven by the
mutants above, not by a test. A test that could reach it would have to test a *copy* of the walk,
which is the failure mode this tracker exists to prevent. That is why the walk also carries a step
bound of its own (the horizon in minutes): **with the guard deleted and the day-jump mutant applied
together** — precisely the 700-second no-output run — the suite finishes in 47.6 s with 4 red tests,
the slowest being one existing test at 10.4 s, which is the walk spinning out the full 2 635 200-step
bound before throwing. Bounded, and with an assertion and a diff, where it used to have neither.

### What the tests assert, and what they cannot

- **Strict advance, per branch, derived.** 378 walks; every step `to > from`, every step's `from`
  equal to the previous step's `to`, and the first step's `from` equal to a seed computed in the test
  from the exported `wallParts`. Branch coverage is measured per zone (`day`/`hour`/`minute` in all
  nine), not assumed; the walk count is a literal so deleting a schedule fails.
- **The fourth branch, separately.** The `gap` move fires once per *missing occurrence*, not once per
  missing minute — only 02:30 is a minute the schedule wants, and the other 29 are walked by the
  minute branch, which cannot know they are missing. Asserted against both transition fixtures, each
  verified to be a zero-instant gap first.
- **Untestable black-box, stated plainly:** whether `advanceCursor`'s refusal is still *wired in*. See
  the last mutation row.
- Two tests deliberately do **not** call the unbounded `nextOccurrence` on an unsatisfiable spec: on
  that input the horizon alone can end the walk, and a test leaning on one structural fact to stop a
  loop it cannot interrupt is a test that can hang. The horizon's claim is discharged on the bounded
  walk — same code path — and the sweep proves the two entry points agree.

### Gates

`npx tsc --noEmit` clean · `npx vitest run` 289 passed (285 + 4 new; one vacuous test rewritten in
place, count unchanged) · `npx tsx harness/smoke.ts` PASS · `arggon validate` ok · `arggon spec
analyze` clean. The p0's negative-offset matrix and the `MAX_BACKLOG_SCAN` literal are untouched and
green; `MAX_BACKLOG_SCAN` stays unexported.
