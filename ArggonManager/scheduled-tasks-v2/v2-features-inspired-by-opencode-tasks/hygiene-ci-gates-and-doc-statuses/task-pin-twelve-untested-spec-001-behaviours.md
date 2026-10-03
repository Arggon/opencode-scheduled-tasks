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

### 2026-10-03 @ses_effd2905cffeg7rQfNPZnLEFGt
## Mutation evidence — every tick is backed by a red, not by belief

All twelve boxes are ticked with the test that turns red, and the mutation is named. Method: edit src/index.ts, run only the named test, restore, confirm green. src/index.ts is untouched in the commit (git diff src/ is empty).

**Box 89** (amended) — existing test 'keeps last-known-good jobs and surfaces the error on malformed JSON', one assertion added, plus the existing 'still reports a corrupt schedules.json when markdown jobs are carrying the schedule'.
- RED: the inert-project notice takes its no-error wording unconditionally (the fileError-undefined ternary → true).
- RED: the read-failure branch dropped (readProblem → undefined).

**Box 96** — new test 'drops a tick that fires while the previous one is still running, instead of nesting it'.
- RED: the re-entrancy guard neutered (if (ticking) return → if (false) return).

**Box 107** — new test 'records a failed scheduled run: status, the message it threw, and no retry inside the occurrence'.
- RED: runJob's catch gutted (lastStatus = failed and lastError both removed).

**Box 135** — existing test 'reports jobs, next run and status through schedules_list', two assertions added, plus the new 135/158 test.
- RED (twice): the ISO conversion replaced by the raw epoch for nextRun/lastRun.

**Box 157** — existing test 'degrades to session defaults and logs once when ctx.permission.rules is missing', one assertion added, plus the new per-tick test 'logs a repeated identical failure once across five ticks'.
- RED (twice): the once-guard deleted from logOnce (if (logged.has(key)) return removed).

**Box 158** — new test 'reports every field the box names, and both instants as absolute ISO-8601'.
- RED: lastStatus/lastError replaced with null — **on the new test only**. The existing-test addition stays GREEN under this mutation, because a never-run job's status already is null. The box note says exactly that, rather than letting the addition look load-bearing.

**Box 162** — new test 'echoes the resolved model in the run's own line', plus the existing order test 'switches the session to the job's model before dispatching the prompt'.
- RED: the resolved model dropped from runJob's running line.
- RED: the switchModel call removed from applyJobTarget.

**Box 165** — existing test 'records the asks a run turned into denies, and states them in its own running line', one assertion added.
- RED: the same 'model dropped from the running line' mutation as 162 — one mutant, two boxes.

**Box 176** — new test 'never holds the server process open to poll a schedule: the tick interval is unref'd'.
- RED: timer.unref() removed. The test asserts the property (handle.hasRef() is false) on a real handle, not that a call was made.

**Box 178** (amended) — new test 'keeps a hostile project id inside the lease directory, whichever separator it brings'.
- RED: the id sanitizer deleted from leasePath.
- The companion 'composes the lockfile path with the host's own separator' test is it.runIf(win32): **skipped on this Linux runner, so not mutation-checked**, and the box note labels it encoded-not-verified.

**Box 179** — new test 'stops everything the cleanup promised: the interval, the lease and the tool registration'. Three effects, three separate reds.
- RED: clearInterval(timer) removed from disarm.
- RED: lease.release() removed from disarm.
- RED: the registration's disposer never pushed into disposers.

**Box 186** — new test 'leaves a removed job's state behind and never uses it again, unless the id returns'.
- RED: setup deletes the state of every job missing from the file — the audit's own proposed mutation.

## Why 96 looked unpinnable, and was not

The audit's note was right and its conclusion was off. Deleting the guard left the suite green **because a re-entrant tick re-reads a window the first one already consumed**, so nothing observable happened. The only place tick awaits before deciding anything is a storage write on the skip path, and resolveDue is synchronous, so the window is microtasks wide. Parking that write holds the first tick open across a real interval boundary with a second job that has not been evaluated yet; the re-entrant tick then has work it would dispatch, and the guard is the only thing stopping it. Same idea as the slow ctx.storage.set the audit guessed at, made deterministic.

## Gates, all green on the worktree

    npx tsc --noEmit                exit 0
    npx vitest run                  exit 0 — 298 passed | 1 skipped (299)
    npx tsx harness/smoke.ts        exit 0 — PASS
    arggon validate                 ok (0 warnings, convention v5)
    arggon spec validate            ok (4 docs, 0 warnings)
    arggon spec analyze             clean (2 specs scanned)

Baseline was 289; the suite still finishes in ~35.6 s, unchanged. Every new test uses fake timers or a parked promise — nothing waits on a wall clock and no test walks the occurrence search.

## Two amendments and one finding I did not fix

- **Box 89 amended.** reloadJobs is called exactly once, from setup, against a state.jobs that is empty at that moment, so the 'retain the last-known-good job set' early return has no caller with a populated job set. That is a dead branch, not a missing test, and ticking it would tick dead code. Amended to the reachable invariant — a broken file costs the project neither its jobs nor its silence — which is pinned by two tests and two reds. The audit offered exactly this amendment.
- **Box 178 amended.** 'behave on Windows' is not observable on a Linux runner; the audit said so in as many words. Narrowed to the confinement the suite can keep true, plus a platform-gated assertion labelled encoded-not-verified rather than counted as a tick.
- **Found, not fixed, because it is a src change.** The id sanitizer keeps the dot, so a project id of exactly '..' composes to join(base, '..', 'writer.lock') — one level ABOVE the lease base directory. leasePath/logPath would then write a lockfile outside their own directory. The new test deliberately does not assert that escaping form as if it were correct, and the box note says so. Coordinator's call: a one-line fix (reject an id that sanitizes to '.' or '..') or a documented limit.

Files: test/index.test.ts (596 lines added, 4 changed) and the spec 001 notes. No README, no package.json, no spec 002 — untouched, for the wave to stay file-disjoint.
