---
type: task
status: in_progress
id: task-pin-twelve-untested-spec-001-behaviours
title: Twelve spec 001 behaviours are true but unpinned by any test
assignee: arggon
branch: fix/task-pin-twelve-untested-spec-001-behaviours
parent: hygiene-ci-gates-and-doc-statuses
labels: []
priority: p2
created: "2026-10-02"
updated: "2026-10-03"
claimed_at: "2026-10-03T05:11:51.872Z"
depends_on: [task-assert-occurrence-walk-jumps-strictly-advance]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-pin-twelve-untested-spec-001-behaviours.md
  Leaves live only under a story. id is the filename stem: task-pin-twelve-untested-spec-001-behaviours.
  CLI `arggon create task pin-twelve-untested-spec-001-behaviours` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Twelve spec 001 behaviours are true but unpinned by any test

## Context

Found by `task-audit-spec-001-acceptance-boxes`, which resolved all 39 spec 001 boxes into: **23
ticked** (each with the test that fails if the behaviour breaks), **1 amended**, **4 false** (filed as
bugs), and **12 true but untested**.

The 12 are the interesting residue. They are behaviours that **are** implemented and that I believe
are correct, but no test turns red if they break — so the audit left them unticked with the mutation
that stays green. That is the honest verdict, and it is also an unpaid debt: spec 001 is a contract,
and these twelve clauses have no enforcement.

Boxes: **89** (malformed JSON retains last-known-good), **96** (tick never re-enters), **107** (failed
run records `failed` and is not retried within its occurrence), **135** (`nextRun` is an absolute
ISO-8601 instant), **157** (a repeated identical failure logs once, not once per tick), **158**
(`schedules_list` reports the documented per-job fields), **162** (the job's model is applied before
the prompt is admitted, and the resolved model is logged), **165** (a job naming no model inherits
the session default and the log says so), **176** (the tick interval is `unref()`ed), **178** (lockfile
paths built with `node:path`, behave on Windows), **179** (the `setup` cleanup clears the interval,
releases the lease and disposes the handlers), **186** (removing a job from the file leaves inert
state behind, never used again).

Five of the twelve are **one missing assertion inside an existing test** — cheaper than they look.

## Acceptance

- [ ] Each of the 12 has a test that **fails** when the behaviour is broken. Mutation-check each: break
      the behaviour, confirm red, restore, confirm green.
- [ ] Where a box is one assertion inside an existing test, add the assertion there rather than a new
      test — and say which box it belongs to.
- [ ] Where a box turns out to be genuinely untestable (e.g. Windows path behaviour on Linux), state
      that and either platform-gate it or amend the box honestly.
- [ ] The 12 boxes in spec 001 are ticked **with the named test** once pinned, matching the standard
      the audit set for the other 23.
- [ ] Mutation discipline: the tick is only claimed when mutating the named behaviour turns a test red.

## Notes

Filed by the coordinator from the spec 001 audit. The audit's method is the standard to follow: **a
tick is only claimed when mutating the named behaviour turns a test red.** That is the line between
"this is true and tested" and "this is true and I believe it", and it is why twelve boxes that are
probably fine are nonetheless open.

Sequence after the four false-box bugs are filed, so this does not compete for `src/index.ts` with
them. Do not edit `src/index.ts` beyond adding tests.
