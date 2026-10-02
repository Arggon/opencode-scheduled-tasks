---
type: task
status: done
id: task-t3-session-mode-and-run-history
title: Session mode (reuse/fresh) and bounded run history
assignee: arggon
branch: feat/task-t3-session-mode-and-run-history
parent: run-control-permissions-session-mode-history
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t1-durations-and-format-tool]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/task-t3-session-mode-and-run-history.md
  Leaves live only under a story. id is the filename stem: task-t3-session-mode-and-run-history.
  CLI `arggon create task t3-session-mode-and-run-history` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Session mode (reuse/fresh) and bounded run history

## Context

`session: reuse|fresh` and a bounded per-job run-history ring buffer with a `schedules_history`
tool. See plan 002 §T3 and spec 002 § "Session mode" / "Run history".

## Acceptance

- [x] `reuse` (default) preserves v1 behaviour; `fresh` creates a new session per run.
- [x] A `session` value other than `reuse`/`fresh` is refused with a named reason.
- [x] Resolved mode appears in `schedules_list` and in the `running` log line.
- [x] History is capped and evicts oldest-first; it can never grow unbounded.
- [x] Each entry records due instant, start, outcome, resolved model and a bounded error string.
- [x] `schedules_history` returns newest-first; an unknown id returns a typed error naming it,
      not an empty success.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
