---
type: task
status: done
id: task-measure-first-tick-stall-after-long-sleep
title: "A long sleep may stall the first tick for seconds at 100 jobs — measure, then decide"
assignee: arggon
branch: chore/task-measure-first-tick-stall-after-long-sleep
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-02"
updated: "2026-10-03"
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

- [x] **Measure it first.** Wall-clock duration of the first tick after a long sleep, at a realistic
      job count (1, 10, 100), with the event loop instrumented so it is clear whether the loop is
      *blocked* (no other work runs) or merely *busy* (yields between iterations). Do not infer one
      from the other.

> **It was blocked. Measured on the real `tick`, driven through `setup` — not a re-implementation.**
>
> Work unit: `Intl.DateTimeFormat#formatToParts` calls, the primitive every occurrence search bottoms
> out in and the only thing in the plugin that calls it. Deterministic — 5 identical runs, identical
> counts. `timezone: "UTC"` pinned in the job file (see the escalation below for why that matters).
>
> | jobs | backlog | lookups (deterministic) | tick wall-clock | **longest stretch with no other work running** |
> |---|---|---|---|---|
> | 1 | 24 h | 6 018 | 50 ms | ~45 ms — the whole tick, which is one walk |
> | 10 | 24 h | 60 180 | 274 ms | **271 ms** |
> | 100 | 24 h | 601 800 | 2 464 ms | **2 453 ms** |
> | 100 | 720 h | 601 800 | 2 417 ms | **2 416 ms** |
> | 100 | 24 h, `backfill` | 604 200 | 2 439 ms | **2 439 ms** |
> | 100 | 30 min | 19 200 | 88 ms | 88 ms |
> | 100 | ~1 min (ordinary tick) | 1 800 | 14 ms | 14 ms |
> | 100, `maxConcurrentRuns: 1` | 24 h | 601 800 | 2 414 ms | **2 411 ms** |
>
> The lookup counts reproduce the predecessor's figures exactly and add what it did not have: at 100
> jobs the tick's longest uninterrupted stretch is **2 453 ms of 2 464 ms** — essentially the whole
> tick. On this machine that is a ~2.5-second freeze of the editor.
>
> **How blocked-vs-busy was established, and why it is conclusive.** Four markers of three different
> scheduling classes were armed *from inside the first `formatToParts` call* — i.e. at the instant
> the decision loop provably began, with no hook into the plugin and no cooperation from it:
> `queueMicrotask`, a resolved-promise `then`, `setImmediate` (check phase) and `setTimeout(0)`
> (timers phase). Each recorded **the lookup count it could see**. The result is an ordering, not a
> duration:
>
> * `queueMicrotask` and `then` fired at lookup **#54 162** — inside the walk, at the first job that
>   took the skip branch and awaited `saveState`. The loop *does* interleave microtasks.
> * `setImmediate` and `setTimeout(0)` fired at lookup **#601 800** — the last one. Neither macrotask
>   class ran until the walk was finished.
>
> That is conclusive because a microtask boundary provably does not end a turn: it drains the
> microtask queue and returns to the *same* stack frame's event-loop turn. So "the promise chain
> progressed while `setImmediate` and `setTimeout` did not" is a statement about the loop, not an
> inference from timing. A self-rescheduling `setImmediate` canary agreed independently, recording a
> single 2.45 s gap. **This is exactly the inference the predecessor flagged as unverified: it read
> `await saveState` as yielding, and that await does yield — just not to anything that can run.
- [x] Report the number before changing anything. If it is already acceptable, say so with the
      measurement and close the task — that is a legitimate outcome, and manufacturing an
      optimisation to look thorough is not one.

> **Reported before anything changed, and it was not acceptable.** Option (a) was tested honestly and
> rejected by the measurement: 2.45 s of an editor's event loop blocked, once, on the first tick after
> a ≥17 h sleep, is not "acceptable because it only happens once" — it is the user's session
> freezing, and this plugin runs *inside* that session (invariant 3). The alarm was real; only the
> remedy in the predecessor's report — accept the 2.3 s — was wrong.
- [x] If it *is* a real stall: decide between yielding to the event loop between jobs, lowering
      the per-job bound, or amortising the walk across ticks the way `catchUp` already amortises replay.
      Whichever you pick, `droppedCapped` must keep meaning "lower bound", and the count reported must
      still agree with the instants it is reported beside — a count that disagrees with the
      occurrences is the ADR 0002 failure this repo exists to catch.

> **Yielding between jobs. The other two were rejected on the measurement, not on taste.**
>
> * *Lower the per-job bound.* It shrinks the stall without removing it — a 4× smaller
>   `MAX_BACKLOG_SCAN` is still 100 jobs back-to-back, ~600 ms — and it weakens the reported lower
>   bound, which is the one number ADR 0002 exists to keep honest. The bound is also the unit the fix
>   is expressed in, so lowering it would move the goalposts rather than fix anything.
> * *Amortise the walk across ticks*, the `catchUp` pattern. The strongest option on paper and by far
>   the biggest of the three: the tick that finds a backlog would no longer *know* the count, so
>   `dropped`/`droppedCapped` and the log clause would need a partially-counted representation, and
>   `droppedCapped` would have to start meaning something it does not today. Real work, for a cost
>   that a turn fixes for ~1.5 µs.
> * *Yield between jobs.* Changes no decision, no count and no order — it only decides when the host
>   process gets to run again. The smallest thing that makes invariant 3 true, so the one taken.
>
> **How it is bounded: by work, not by a clock.** `tick` meters occurrences walked since the last turn
> and takes one `setImmediate` at the top of an iteration that would push the meter past a whole
> `MAX_BACKLOG_SCAN`. The bound is therefore *no blocking run is longer than one job's bounded walk*,
> **whatever the job count** — which is the property O(jobs) never stated, because bounding total work
> says nothing about the longest run of it.
>
> Before → after, same harness, same machine; the deterministic quantities in bold:
>
> | jobs | longest blocking run, before | blocks after | longest blocking run, after |
> |---|---|---|---|
> | 1 | 46 ms | 0 turns (one block, one walk) | 46 ms |
> | 10 | 271 ms | 9 | 37–70 ms |
> | 100 | **2 453 ms** | **99** | **~32–40 ms** |
> | 100, 720 h | **2 416 ms** | **99** | ~40 ms |
> | 100, ordinary tick | 14 ms | 0 | 14 ms — unchanged |
> | 100, 30 min | 88 ms | 2 | ~28 ms |
>
> The **block count** is the trustworthy number — 99 for 100 jobs on every run, one turn between every
> pair of walks. The per-block *duration* is machine noise on a shared box (31–120 ms across repeated
> runs of one scenario; a single walk is ~24 ms warm), which is exactly why the tests assert turns and
> lookup counts and never a duration.
>
> **`droppedCapped` and the count: untouched, and now pinned in three more places.** The meter reads
> `occurrence.dropped` and adds it up; it never reports, rewrites or reinterprets it.
> `droppedCapped` still means "lower bound", `MAX_BACKLOG_SCAN` keeps its literal 1000 and stays
> unexported, the durable `catchUp` plan still carries the remainder across replays, and the count the
> log and the run record print is the same number the walk produced. The three pre-existing tests that
> pin those still pass untouched, and `MAX_BACKLOG_SCAN` 1000→5000 still fails 10.
>
> **Nothing else moved.** No decision, no order, no admission: `resolveDue` has already decided and
> already mutated the record before a turn is taken, `decisions` keeps the loop's order, and the shared
> per-tick budget is still seeded once from `decisions.length`. The one thing the turn *does* change is
> real and is the point — a run still in flight from an earlier tick can now settle while the loop
> waits — and it can only free a slot, never hand one out twice.
>
> **`boundRun`, the `claimed` budget, the `yaml` seam and `ensureLogDir`: not touched.** `git diff` is
> `src/index.ts` (the meter, one `await`, one 10-line helper), `test/index.test.ts` (4 tests), this
> file, the spec box, and the predecessor item's comment.
- [x] Whatever the answer, the number and the method go in the comment on
      `bug-tick-cost-grows-with-sleep-not-with-jobs`, which is where the measurements live.

> Added to that item as "the question this item was filed for" — the 2.45 s blocked measurement, the
> marker method and why it is conclusive, and the after. Edited in the file and committed on this
> branch rather than written with `arggon comment`, which auto-commits to the primary's `main`.

## Notes

Filed by the coordinator from the tick-cost worker's report. p2 and **not** a bug: the cost is bounded,
linear, and paid once. The open question is whether a bounded 2.3 s of work is also a visible stall,
and nobody has looked.

**Do not disturb** `MAX_BACKLOG_SCAN`'s export decision (keep it unexported, assert the literal) or the
`catchUp` plan. Both were argued and are covered.

## Escalation — a correctness bug found while measuring, NOT fixed here

Found on the way to the measurement above, and **not** in scope, and **not** fixed on this branch: a
`nextOccurrence` defect that makes it skip occurrences in any zone **west of UTC**, which makes the
`dropped` count it feeds **wrong**.

`nextOccurrence` walks its search cursor in *UTC* wall parts (`wallFromUtc(wall)`) and then hands
those parts to `wallToInstant`, which reads them as *local* parts. The two agree only when the offset
is zero. For a negative offset the returned instant is `|offset|` ahead of where the walk was, so the
next call resumes that much further along and the gap is skipped. Consecutive occurrences of
`* * * * *`, from 2026-10-02T00:00Z, 5 steps each:

| zone | offset | step between consecutive minutely occurrences | `dropped` for a 24 h window |
|---|---|---|---|
| `UTC` | 0 | 1 min | 1000 (capped) — correct |
| `Europe/Madrid` | +2 h | 1 min | 1000 (capped) — correct |
| `Asia/Kolkata` | +5 h 30 m | 1 min | 1000 (capped) — correct |
| `Pacific/Kiritimati` | +14 h | 1 min | 1000 (capped) — correct |
| `America/New_York` | **−4 h** | **241 min** | **4** |
| `America/Buenos_Aires` | **−3 h** | **181 min** | **6** |

Expected for a 24 h minutely window: **1439**. So a backlog is reported as "6 occurrence(s) dropped"
when it was ~1439, `droppedCapped` is absent, and the count **disagrees with the occurrences it is
reported beside** — a straight ADR 0002 failure, and a larger one than anything this item measured.
The existing timezone tests all use `MADRID` (+2), which is why it is uncaught; the defect is
pre-existing on `main` (verified: `nextOccurrence` is byte-identical to the primary checkout).

**Why it is not fixed here:** this item's brief is explicit that work which reveals more work is
reported to the coordinator rather than growing the diff, and the fix is not a local one — the
search cursor's frame has to change, which touches `nextOccurrence`, `wallToInstant`, and every test
that pins the current (wrong) step. It is a p1 correctness item, not a p2 cost one.

**It does constrain this item's measurement**, which is why `timezone: "UTC"` is pinned in the harness
and in the new tests: on this host (`America/Buenos_Aires`) a minutely job owes ~6 occurrences
instead of ~1440, so the walk is ~1000× cheaper than the real worst case and the stall would have
measured as a non-event.
