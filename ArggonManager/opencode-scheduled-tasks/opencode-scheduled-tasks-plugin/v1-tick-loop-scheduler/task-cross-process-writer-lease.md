---
type: task
status: in_progress
id: task-cross-process-writer-lease
title: Cross-process writer lease
assignee: arggon
parent: v1-tick-loop-scheduler
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T12:46:55.896Z"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-cross-process-writer-lease.md
  Leaves live only under a story. id is the filename stem: task-cross-process-writer-lease.
  CLI `arggon create task cross-process-writer-lease` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Cross-process writer lease

## Context

T3 of `plan-001`. Implements ADR 0003, which also removes this plugin's dependence on the
unverified cross-process behaviour of `ctx.storage`. See plan §T3 and spec 001
§"Concurrency".

## Acceptance

- [ ] Acquires the lease with `fs.open(path, "wx")` (atomic exclusive create) under a
      per-project data directory; `EEXIST` means another live instance holds it.
- [ ] The lease records PID and heartbeat; the heartbeat is refreshed each tick.
- [ ] A lease staler than `leaseTtl` is reclaimed, so a `SIGKILL`ed server does not wedge
      scheduling.
- [ ] Released in the `setup` cleanup, and reclaim-after-release is handled like any other
      stale lease.
- [ ] A second instance logs exactly one line and does not arm the tick loop.
- [ ] If the directory cannot be created, the scheduler runs **without** the lease and
      records that degradation, rather than disabling itself.
- [ ] Test covers: second instance inert, expired heartbeat reclaimed, and the
      lease-free degraded path.



## Notes

Grounded against ArggonManager's `opencode/plugins/arggon/index.ts` and the
V2 plugin guide; see exploration 001 §"Grounded facts".
