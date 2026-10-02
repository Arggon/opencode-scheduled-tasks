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

- [ ] The miss computation is bounded independently of backlog length, **or** its cost is justified
      in a comment with the measurement that justifies it.
- [ ] The work is not discarded: whatever the collapse walk computes is either printed or recorded,
      or it is not computed. If `dropped`/`droppedCapped` stay unread, delete the computation rather
      than paying for it 2× a minute forever.
- [ ] A test or benchmark pins the bound so a future change cannot quietly reintroduce an
      unbounded walk. A synthetic 1000-occurrence backlog with an injected clock is sufficient — no
      real-time performance assertion needed.
- [ ] The spec box is re-worded to describe the bound that actually holds, or the code is brought
      under it.

## Notes

Filed by the coordinator from the spec 001 audit. Deliberately **not** merged into the backfill item:
this is a cost-invariant violation and would be lost inside a correctness fix. If it turns out the
two share a root cause — a collapse path that computes and discards — say so in your report and the
coordinator will sequence them together.

### handoff 2026-10-02 @ses_f01169724ffecGiuYkio61NMWf (session: ses_f01169724ffecGiuYkio61NMWf) — next: Coordinator: code-review 4e22019 and merge. Verdict is (a) - cost measured acceptable, count left as an enumeration; no behaviour change to review.
- branch: fix/bug-tick-cost-grows-with-sleep-not-with-jobs
- open questions: Aggregate worst case is ~2.3s once for 100 jobs all backlogged (needs 17h+ sleep) - accept, or should tick yield between jobs?; item text still says O(occurrences) not O(jobs) in its H1 - retitle?

### 2026-10-02 @ses_f01169724ffecGiuYkio61NMWf
Worker report — **verdict (a): the cost is acceptable as it stands**, decided on a measurement taken before anything changed. The count stays an **enumeration**; what shipped is documentation plus tests that pin the bound.

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
