---
type: task
status: done
id: task-t6-session-loops
title: Session loops
assignee: arggon
branch: feat/task-t6-session-loops
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t5-one-off-tasks]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/task-t6-session-loops.md
  Leaves live only under a story. id is the filename stem: task-t6-session-loops.
  CLI `arggon create task t6-session-loops` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Session loops

## Context

`schedules_start_loop` / `schedules_stop_loop` for in-session recurring prompts with a default
three-day expiry. Implements ADR 0006.

See plan 002 §T6 and spec 002 § "Session loops".

## Acceptance

- [x] A loop posts into **the session that created it** and nowhere else.
- [x] Intervals are durations, not cron; a sub-minute interval is refused with a named reason.
- [x] A loop auto-disables at its three-day expiry and the expiry is reported.
- [x] Per-session cap (default 10) is enforced and reported when reached.
- [x] Stopping an unknown id returns a typed error naming it; stopping with no id stops all.
- [x] A loop cannot outlive its session, and loops are cleared when the session is gone.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
