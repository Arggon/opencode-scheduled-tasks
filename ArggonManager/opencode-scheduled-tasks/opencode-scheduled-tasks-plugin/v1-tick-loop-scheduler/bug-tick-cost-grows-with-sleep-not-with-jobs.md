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
