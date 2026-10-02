---
type: task
status: in_progress
id: task-t5-one-off-tasks
title: One-off tasks
assignee: arggon
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T15:17:56.705Z"
depends_on: [task-t3-session-mode-and-run-history]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/task-t5-one-off-tasks.md
  Leaves live only under a story. id is the filename stem: task-t5-one-off-tasks.
  CLI `arggon create task t5-one-off-tasks` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# One-off tasks

## Context

`schedules_schedule` / `schedules_cancel` for absolute-instant, single-run tasks under their own
storage namespace. Implements ADR 0006, which narrows ADR 0001 to recurring jobs only.

See plan 002 §T5 and spec 002 § "One-off tasks".

## Acceptance

- [ ] A one-off fires exactly once at its instant and is then gone.
- [ ] A one-off **never** appears in or mutates a job file (ADR 0006 guarantee).
- [ ] A past instant is refused, or run within a small documented grace window — never silently
      treated as "due now".
- [ ] Cancelling an unknown or already-completed id returns a typed error naming the id.
- [ ] Completed one-offs survive only inside run history, then are discarded.
- [ ] Per-project cap (default 50) is enforced and **reported** when reached.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
