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

- [x] Each of the 12 has a test that **fails** when the behaviour is broken. Mutation-check each: break
      the behaviour, confirm red, restore, confirm green.
- [x] Where a box is one assertion inside an existing test, add the assertion there rather than a new
      test — and say which box it belongs to.
- [x] Where a box turns out to be genuinely untestable (e.g. Windows path behaviour on Linux), state
      that and either platform-gate it or amend the box honestly.
- [x] The 12 boxes in spec 001 are ticked **with the named test** once pinned, matching the standard
      the audit set for the other 23.
- [x] Mutation discipline: the tick is only claimed when mutating the named behaviour turns a test red.

## What was done (2026-10-03)

`src/index.ts` is **untouched** — `git diff src/` is empty. Everything is tests plus the spec
notes. Suite: **289 → 299 tests** (298 pass, 1 `win32`-gated skip), `tsc --noEmit` clean, smoke
PASS, `arggon validate` / `spec validate` / `spec analyze` ok / clean.

| Box | Pinned by | Mutation run | Red? |
| --- | --- | --- | --- |
| 89 | amended + "keeps last-known-good jobs and surfaces the error on malformed JSON" (+1 assertion) and the existing markdown-corrupt test | idle notice takes its no-error wording unconditionally; `readProblem = undefined` | yes, twice |
| 96 | new "drops a tick that fires while the previous one is still running" | `if (ticking) return` → `if (false)` | yes |
| 107 | new "records a failed scheduled run…" | gut `runJob`'s catch | yes |
| 135 | existing list test (+2 assertions) and the new 135/158 test | `new Date(record.nextRun).toISOString()` → raw epoch | yes, twice |
| 157 | existing permission-degrade test (+1 assertion) and the new per-tick test | delete `if (logged.has(key)) return` from `logOnce` | yes, twice |
| 158 | new 135/158 test (+ the existing list test for the null form) | `lastStatus`/`lastError` → `null` | yes on the new test; **no** on the addition — stated in the note |
| 162 | new "echoes the resolved model in the run's own line" + the existing order test | drop `model ${model}` from the running line; drop the `switchModel` call | yes, twice |
| 165 | existing ask-as-deny test (+1 assertion) | the same `model ${model}` mutation as 162 | yes |
| 176 | new "never holds the server process open…" | remove `timer.unref?.()` | yes |
| 178 | amended + new "keeps a hostile project id inside the lease directory"; the Windows half is `it.runIf(win32)` | delete the sanitizer in `leasePath` | yes for the sanitizer; the Windows assertion is **skipped here**, so not mutation-checked |
| 179 | new "stops everything the cleanup promised…" | remove `clearInterval(timer)`; remove `lease.release()`; never push the registration disposer | yes, three times |
| 186 | new "leaves a removed job's state behind…" | `setup` deletes the state of every job missing from the file (the audit's own proposal) | yes |

**One-assertion additions inside existing tests** (the five the item predicted): boxes 89 and
135/158 in "plugin setup — context wiring and failure isolation", box 165 (and, by the same
mutation, box 162) in "records the asks a run turned into denies…", box 157 in "degrades to session
defaults and logs once when `ctx.permission.rules` is missing". Each names its box in a comment at
the assertion.

**Two boxes amended, and why.** Box 89 asked for a *retention* that has no caller: `reloadJobs` is
called exactly once, from `setup`, against a `state.jobs` of `[]`, so "retains the last-known-good
job set" describes a dead branch rather than a missing test. The audit itself offered this
amendment; it is now the reachable invariant — a broken file costs the project neither its jobs nor
its silence — and that is pinned. Box 178's "behave on Windows" is not observable on a Linux runner
(the audit said so in as many words), so the box is narrowed to the confinement the suite can keep
true, and the Windows claim is platform-gated and labelled encoded-not-verified.

**Found and reported, not fixed (out of scope: a `src` change).** The id sanitizer keeps `.`, so a
project id of exactly `..` composes to a lockfile one level **above** the lease base directory
(`join` normalises it away). The new test deliberately does not assert that escaping form as if it
were correct. Coordinator's call: a one-line fix, or a documented limit.

## Notes

Filed by the coordinator from the spec 001 audit. The audit's method is the standard to follow: **a
tick is only claimed when mutating the named behaviour turns a test red.** That is the line between
"this is true and tested" and "this is true and I believe it", and it is why twelve boxes that are
probably fine are nonetheless open.

Sequence after the four false-box bugs are filed, so this does not compete for `src/index.ts` with
them. Do not edit `src/index.ts` beyond adding tests.
