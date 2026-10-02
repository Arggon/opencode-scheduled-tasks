---
type: task
status: done
id: task-misfire-resolution-and-run-state-machine
title: Misfire resolution and run-state machine
assignee: arggon
parent: v1-tick-loop-scheduler
labels: []
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-misfire-resolution-and-run-state-machine.md
  Leaves live only under a story. id is the filename stem: task-misfire-resolution-and-run-state-machine.
  CLI `arggon create task misfire-resolution-and-run-state-machine` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Misfire resolution and run-state machine

## Context

T2 of `plan-001`. Pure module: a reducer over an injected clock. Owns the cost-bounding
invariant (ADR 0002). See plan §T2 and spec 001 §"Limits" / §"Concurrency" /
§"Persistence".

## Acceptance

- [x] `misfire: "skip"` collapses a backlog of 8 missed occurrences to exactly one run.
- [x] `misfire: "backfill"` replays at most `maxCatchUp` occurrences oldest-first and records
      the dropped remainder as truncated.
- [x] A job with a run in flight records its next occurrence as skipped; it is never queued.
- [x] `maxConcurrentRuns` is enforced globally.
- [x] Run state (`lastRun`, `nextRun`, `lastStatus`, `lastError`) is a versioned record; an
      unknown version re-initializes instead of misreading, and a corrupt entry is dropped
      with `nextRun` recomputed.
- [x] A failed run records `failed` and is not retried within the occurrence.
- [x] `nextRun` advances arithmetically: one tick is O(jobs), never O(missed minutes).



## Notes

Grounded against ArggonManager's `opencode/plugins/arggon/index.ts` and the
V2 plugin guide; see exploration 001 §"Grounded facts".
