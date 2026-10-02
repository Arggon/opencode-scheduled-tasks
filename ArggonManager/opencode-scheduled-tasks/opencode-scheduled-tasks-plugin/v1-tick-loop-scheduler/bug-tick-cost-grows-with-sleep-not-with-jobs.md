---
type: bug
status: todo
id: bug-tick-cost-grows-with-sleep-not-with-jobs
title: "One tick costs O(occurrences), not O(jobs): a long sleep walks 1000 occurrences to log a number nobody reads"
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
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

Cost grows with **backlog**, not with jobs. Under `misfire: "skip"` the scheduler walks up to 1000
occurrences to compute a collapse count that **no log line and no record ever prints** — because
`dropped`/`droppedCapped` are read by nothing (see `bug-backfill-collapses-to-one-run-and-never-reports-truncation`).

Measured: ~1.9 ms per tick at a 24 h sleep, **~48.8 ms at 720 h (30 d)**. So the arithmetic claim is
true of `nextRun` and false of the miss computation, and the work being done is discarded.

This matters twice over: it is a cost invariant stated in the spec and violated in the code, and a
tick that walks 1000 occurrences is unbounded work on a path that runs unattended every 30 s by
default.

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
