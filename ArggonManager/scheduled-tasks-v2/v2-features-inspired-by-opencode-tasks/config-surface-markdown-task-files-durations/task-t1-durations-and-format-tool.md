---
type: task
status: todo
id: task-t1-durations-and-format-tool
title: Duration parsing and the schedules_format tool
parent: config-surface-markdown-task-files-durations
labels: []
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/task-t1-durations-and-format-tool.md
  Leaves live only under a story. id is the filename stem: task-t1-durations-and-format-tool.
  CLI `arggon create task t1-durations-and-format-tool` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Duration parsing and the schedules_format tool

## Context

Compound duration parser accepting `30s`, `5m`, `2h`, `1d` and compounds like `1h30m`;
plain numbers mean seconds. Wired as `runTimeout` on both config surfaces while the existing
`runTimeoutMs` keeps working. Adds `schedules_format`.

See plan 002 §T1 and spec 002 § "Durations".

## Acceptance

- [ ] A table-driven test pins every accepted duration form and every rejection.
- [ ] A malformed or non-positive duration is refused with a named reason, never silently
      defaulted.
- [ ] `runTimeoutMs` behaves exactly as in v1 (additive, non-breaking).
- [ ] `schedules_format` returns the job-file reference, naming **both** config surfaces and the
      markdown-wins precedence rule.
- [ ] `schedules_format` documents the per-job `model` field, so an agent cannot author a job
      that silently inherits a paid model.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
