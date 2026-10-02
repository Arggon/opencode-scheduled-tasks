---
type: bug
status: in_progress
id: bug-tick-cost-grows-with-sleep-not-with-jobs
title: "One tick costs O(occurrences), not O(jobs): a long sleep walks 1000 occurrences to log a number nobody reads"
assignee: arggon
branch: fix/bug-tick-cost-grows-with-sleep-not-with-jobs
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T23:17:22.320Z"
depends_on: [bug-backfill-collapses-to-one-run-and-never-reports-truncation]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-tick-cost-grows-with-sleep-not-with-jobs.md
  Leaves live only under a story. id is the filename stem: bug-tick-cost-grows-with-sleep-not-with-jobs.
  CLI `arggon create bug tick-cost-grows-with-sleep-not-with-jobs` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# One tick costs O(occurrences), not O(jobs): a long sleep walks 1000 occurrences to log a number nobody reads

## Context

Found by `task-audit-spec-001-acceptance-boxes`: **spec 001 box 124 is false.** The audit's verdict is
recorded on the box in the spec, with measurements.

The box claims:

> One tick costs O(jobs): `nextRun` is advanced arithmetically, so cost never grows with backlog.

Cost grows with **backlog**, not with jobs. Under `misfire: "skip"` the scheduler walked up to 1000
occurrences (`MAX_BACKLOG_SCAN`) to compute a collapse count that **no log line and no record ever
printed**.

> ### ⚠ Premise corrected by `bug-backfill-collapses-to-one-run-and-never-reports-truncation`
>
> The original framing of this item was "the walk computes a number nothing reads, so delete the
> computation". **That is no longer true and must not be acted on.** The backfill fix made the
> collapsed count **load-bearing**: `dropped` / `droppedCapped` are now reported in the log *and* on
> every run record of the backlog, exactly as ADR 0002 requires. Deleting the computation would
> reinstate the very silence this repo just spent an item eliminating.
>
> So the remedy has changed. It is now: **compute the count without walking the occurrences**, or
> accept the cost with a measurement that justifies it. The arithmetic that makes `nextRun` cheap
> should be reachable for the miss count too — `missedOccurrences` is an enumeration where the rest
> of the file is arithmetic.
>
> Measured by the backfill worker after its fix: a 720 h backlog costs **25–41 ms once**, and the
> next ordinary tick **0.17–0.19 ms** — i.e. the walk happens once per backlog, not once per tick.
> That is far better than the audit's 48.8 ms *per tick*, and it may well be acceptable. Judge it on
> the measurement rather than inheriting the original alarm.

## Acceptance

- [x] The miss computation is bounded independently of backlog length, **or** its cost is justified
      in a comment with the measurement that justifies it.

> **First branch — it already held, and is now measured and pinned.** The enumeration is capped by
> `MAX_BACKLOG_SCAN`, so the work is flat in sleep length: a `* * * * *` job costs the **identical
> 6012 timezone lookups** for a backlog of 24 h, 720 h, 8760 h, 87600 h and 876000 h (measured
> 2026-10-02, before and after this branch — unchanged, because what shipped is documentation and
> pinning, not a behaviour change). 22–27 ms for the walk; 12 lookups (~0.07 ms) for the next
> ordinary tick; 6 per `backfill` replay tick. The bound and the measurement are now written at
> `MAX_BACKLOG_SCAN` (src/index.ts:1528) and on `missedOccurrences`, replacing the stale
> "a number nobody acts on" comment — which described a premise this tracker has since corrected.

- [x] The work is not discarded: whatever the collapse walk computes is either printed or recorded,
      or it is not computed. If `dropped`/`droppedCapped` stay unread, delete the computation rather
      than paying for it 2× a minute forever.

> **The count is printed and recorded, and that is now proven rather than asserted.** It rides the
> log line once per backlog (`truncationClause`) and **every** run record of the backlog
> (`truncationFields`). Mutation-checked: making `truncationFields` return `{}` fails 5 tests;
> making `truncationClause` return `""` fails 3. A third mutation found a real gap, now closed:
> deleting only the `" or more; the backlog scan bound was reached"` wording from the log clause —
> reporting a lower bound as though it were a count — left the suite **fully green**. New test
> “says a capped count is a lower bound in the log, not just a number” pins it (that mutation now
> fails 1).

- [x] A test or benchmark pins the bound so a future change cannot quietly reintroduce an
      unbounded walk. A synthetic 1000-occurrence backlog with an injected clock is sufficient — no
      real-time performance assertion needed.

> Five unit tests and one plugin-level test, all asserting **work counts**, never durations. Work is
> counted by instrumenting `Intl.DateTimeFormat#formatToParts` — the primitive every occurrence
> search bottoms out in, and the only thing in the plugin that calls it — through a `lookupsDuring`
> helper, so the assertion is deterministic and a timing flake is impossible by construction.
> Named: “stops at the bound instead of at the backlog: a year of sleep costs the same as a day”
> (work for a year === work for a day), “keeps a backlog smaller than the bound exact, so
> `droppedCapped` stays honest”, “reports the count on the run record, not only in the log”,
> “charges the walk to the tick that finds the backlog, not to every tick after it” (the
> amortization), “replays a `backfill` backlog off the plan, so each replay tick costs one search
> too” (the durable plan is why a draining backlog is not re-counted per tick), “scales with the
> number of jobs, not with the number of occurrences each one owes” (O(jobs × bound)), plus the log
> test above. Mutations: `MAX_BACKLOG_SCAN` 1000→5000 → **6 failed**; the walk bound removed
> (`Number.MAX_SAFE_INTEGER`) → **6 failed**; `consume()` no longer advancing the cursor, i.e. the
> amortization gone → **1 failed**, exactly the amortization test; `droppedCapped` forced `false` →
> **4 failed**.

- [x] The spec box is re-worded to describe the bound that actually holds, or the code is brought
      under it.

> spec 001 box 124 reworded to the invariant that holds and is now tested: `nextRun` is advanced
> arithmetically, the dropped-backlog count is bounded by `MAX_BACKLOG_SCAN`, the cost therefore does
> not grow with sleep past that ceiling, and it is paid once per backlog rather than once per tick.
> The audit's original verdict is kept beneath the new one as history, with a note that its
> "no caller reads" premise no longer applies.

## Decision: option (a) — the cost is acceptable as it stands

Both remedies were open. **(a) was chosen, on the measurement, and the count stays an enumeration.**
The reasoning, so the next reader does not have to re-derive it:

- **The alarm was stale.** The audit's 48.8 ms *per tick* figure predates the predecessor item that
  made the count load-bearing. On this branch the walk is paid **once per backlog**: 22–27 ms once,
  then ~0.07 ms per ordinary tick.
- **The bound is arithmetic in the sense that matters.** `MAX_BACKLOG_SCAN` stops the walk at a fixed
  ceiling, which is what makes a tick a function of jobs. Work is *identical* from 24 h of sleep to
  100 years of it — the walk saturates, so sleep length is not in the cost.
- **A closed-form count is not merely more work; it is a worse answer.** Cron occurrences are a
  function of a timezone, a calendar and DST, so an exact count *is* a search. Counting per
  (day, hour) against a `spec.minutes.size` cardinality would cut a minutely backlog's work by
  roughly 180×, but it needs a second walk whose result must agree exactly with `nextOccurrence`
  under spring-forward and the Vixie day rule — and a count that disagrees with the instants it is
  reported beside is precisely the ADR 0002 failure this tracker exists to catch. Paying ~23 ms
  **once per backlog** is a good trade against that risk.
- **There is no "arithmetic machinery in the rest of the file" to reuse**, contrary to the item's
  framing: `nextRun` is advanced with a *single* `nextOccurrence` call, not by an arithmetic step
  across the window. It is cheap in backlog length because it searches forward once, which is a
  different mechanism from the one a miss count needs.

**Worst case, stated honestly**: at `DEFAULT_MAX_JOBS` (100 jobs) with every job owing a capped
backlog — which needs ≥17 h of sleep, since 1000 minutely occurrences is 16.7 h — one tick costs
~602 000 lookups / **~2.3 s, once**. The next ten ticks over those same 100 jobs total ~15 000
lookups / ~59 ms. That is a stall on the first tick after a long sleep, not a per-tick cost, and it
is linear in jobs as the box now claims.

## `MAX_BACKLOG_SCAN`: keep it unexported, assert the literal

**Do not export it.** A test that imported the constant would follow any new value silently, so
doubling the walk — a 2× cost change to every backlog — would pass green. `test/index.test.ts`
declares `const SCAN_BOUND = 1000` with that reasoning recorded, so raising the bound breaks an
assertion in the open and shows up in the diff as the cost decision it is. Confirmed by mutation:
1000→5000 fails 6 tests. Exporting it would have made the strongest available test unwritable.

## `droppedCapped`'s lower-bound meaning

Unchanged, and still honest, because the count stayed an enumeration — which is exactly the case the
flag was written for. Past the bound it remains a **lower bound**, and two new tests pin the
distinction in both directions: a window of exactly 1001 occurrences with one instant returned leaves
exactly 1000 to count, so the walk *ends* on the bound without being cut short — `dropped: 1000`,
`droppedCapped: false` — while one occurrence more gives `droppedCapped: true`. (The old box comment
implied "exactly at the bound" was the flagged case; it is the **un**flagged one.)

## Notes

Filed by the coordinator from the spec 001 audit. Deliberately **not** merged into the backfill item:
this is a cost-invariant violation and would be lost inside a correctness fix. If it turns out the
two share a root cause — a collapse path that computes and discards — say so in your report and the
coordinator will sequence them together.

**Answered by this branch: yes, they shared a root cause, and the predecessor already resolved it.**
The discarded computation *was* the collapse count; `bug-backfill-collapses-to-one-run-and-never-reports-truncation`
made it load-bearing rather than leaving it to be deleted here. There is no shared code left to fix —
what remained was the cost of a computation that is now reported, which is what this item measured.

Untouched, deliberately: `README.md` (T7 owns docs), and the rest of `src/index.ts` /
`test/index.test.ts` beyond the cost comments and the new tests — no behaviour change, because the
measurement did not justify one.

## Worker report — commit 4e22019

## 1. The measurement I took first (before touching anything)

Work unit: `Intl.DateTimeFormat#formatToParts` calls. It is the primitive every occurrence search bottoms out in (`wallParts`) and the only thing in the plugin that calls it, so counting them counts searches exactly — not a wall-clock proxy. Deterministic: 5 identical calls → identical count.

`missedOccurrences`, `* * * * *`, `limit 1`:

| backlog | work | ms | dropped | capped |
|---|---|---|---|---|
| 1 h | 366 | 2.2 | 59 | false |
| 8 h | 2 886 | 16.2 | 479 | false |
| **24 h** | **6 012** | 27.0 | 1000 | true |
| **720 h** | **6 012** | 24.1 | 1000 | true |
| **8 760 h** | **6 012** | 27.0 | 1000 | true |
| **87 600 h** | **6 012** | 22.1 | 1000 | true |
| **876 000 h** | **6 012** | 23.4 | 1000 | true |

**The work is flat in sleep length.** `MAX_BACKLOG_SCAN` already caps the enumeration, so the audit's "cost grows with sleep" premise does not hold on this branch.

`resolveDue` per tick, one job:

| | backlog tick | next tick |
|---|---|---|
| `skip`, hourly, 720 h | 4 332 / 21.9 ms | 12 / 0.065 ms, decision none |
| `skip`, minutely, 8 760 h | 6 018 / 30.1 ms | 12 / 0.072 ms, decision none |
| `backfill` minutely 720 h | 6 042 / 24.9 ms (tick 1) | 6 per replay tick (ticks 2–5) |

Aggregate, `DEFAULT_MAX_JOBS` = 100: backlog tick **601 800 / 2.34 s, once** (needs ≥17 h asleep — 1000 minutely occurrences is 16.7 h); the next ten ticks over the same 100 jobs total **15 000 / 59 ms**, i.e. ~6 ms per tick.

## 2. (a) or (b), and why

**(a).** The alarm was stale — 48.8 ms *per tick* predates the item that made the count load-bearing. The bound is already arithmetic in the sense that matters: a fixed ceiling makes the tick a function of jobs.

A closed-form count is not merely more work, it is a **worse answer**. Cron occurrences are a function of timezone, calendar and DST, so an exact count *is* a search. Counting per (day, hour) against `spec.minutes.size` would cut a minutely backlog's work ~180×, but it needs a second walk that must agree exactly with `nextOccurrence` under spring-forward and the Vixie day rule — and a count disagreeing with the instants it is reported beside is precisely the ADR 0002 failure this tracker exists to catch. ~23 ms **once per backlog** is a good trade.

**Correction to the item's framing:** there is no "arithmetic step from `from` to `to`" in the file to reuse. `nextRun` is advanced with a *single* `nextOccurrence` call — O(1) in backlog length because it searches forward once, a different mechanism from what a miss count needs.

## 3. Before/after

Identical, by design: no behaviour change, documentation + tests only. Re-measured after the change — same 6 012 / 12 / 6. **Before == after; the change is the bound becoming pinned rather than cheaper.**

## 4. `droppedCapped`

Unchanged and still honest — enumeration is exactly the case the flag was written for. Now pinned in both directions, which surfaced an error in the old code comment ("exactly at the bound" is the **un**flagged case):

* 1001 occurrences, limit 1 → `dropped: 1000, droppedCapped: false` (walk *ends* on the bound, not cut short)
* 1002 occurrences → `dropped: 1000, droppedCapped: true`

## 5. `MAX_BACKLOG_SCAN`: **do not export**

Asserting the literal is the stronger test. An imported-constant test would follow a new value silently, so doubling the walk would pass green; the literal breaks the assertion in the open. Confirmed: 1000→5000 fails 6 tests. Exporting would make the strongest available test unwritable.

## 6. Every mutation and what it caught

| mutation | result |
|---|---|
| `MAX_BACKLOG_SCAN` 1000→5000 | **6 failed** |
| walk bound removed (`Number.MAX_SAFE_INTEGER`) | **6 failed** |
| `consume()` no longer advances the cursor (amortization gone) | **1 failed** — exactly the amortization test |
| `droppedCapped` forced `false` | **4 failed** |
| `truncationFields` → `{}` (count computed, never recorded) | **5 failed** |
| `truncationClause` → `""` (never logged) | **3 failed** |
| **drop only the "or more; the backlog scan bound was reached" wording** | **0 failed — a real gap**, now closed by a new test (mutation now fails 1) |

That last row is the find worth the reviewer's attention: a lower bound was being reported as a count in the one line a human reads, and nothing caught it. (Two earlier mutants of mine were bad — a no-op patch and a semantically inert one — re-run correctly before quoting any result.)

## 7. Untestable / not claimed

* **Wall-clock** is not asserted anywhere, deliberately. Real durations are recorded on the item and in the spec box as measurements only.
* The ~2.3 s aggregate is measured, not asserted — a 100-job test would burn 2.3 s of CPU per run. The per-job ceiling is asserted; the linearity in jobs is asserted by 5-job vs 5-job comparisons.
* **Not claimed:** that 100 jobs × bound is a *good* cost. It is linear and once, but it is a ~2.3 s stall on the first tick after a long sleep. Raised as an open question rather than settled by me.
* I did not verify whether the tick's async structure already yields to the event loop mid-loop (it awaits storage per job, which suggests it does) — so "2.3 s of blocked event loop" may be an overstatement. Left as a question rather than asserted.

## 8. Counts and gates

Tests **245 → 252** (7 new: 6 unit + 1 plugin-level). `tsc --noEmit` clean; `vitest run` 252/252; `harness/smoke.ts` PASS; `arggon validate` ok (0 warnings); `arggon spec validate` ok; `arggon spec analyze` clean. `node_modules` untracked and unstaged. Commit `4e22019` on `fix/bug-tick-cost-grows-with-sleep-not-with-jobs`; four paths staged explicitly.

**Untouched deliberately:** `README.md` (T7 owns docs), spec 002, any other item, and all of `src/index.ts` beyond the three cost comments.
