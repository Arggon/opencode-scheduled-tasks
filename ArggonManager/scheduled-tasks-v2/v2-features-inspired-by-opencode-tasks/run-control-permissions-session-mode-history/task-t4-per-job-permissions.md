---
type: task
status: in_progress
id: task-t4-per-job-permissions
title: Per-job permission rules
assignee: arggon
parent: run-control-permissions-session-mode-history
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T15:15:20.711Z"
depends_on: [task-t3-session-mode-and-run-history]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/task-t4-per-job-permissions.md
  Leaves live only under a story. id is the filename stem: task-t4-per-job-permissions.
  CLI `arggon create task t4-per-job-permissions` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Per-job permission rules

## Context

Per-job `permissions` in OpenCode's own schema, applied via `ctx.permission.rules()` immediately
before `session.prompt`. Implements ADR 0005; the semantics warnings originate from
`opencode-tasks` (see ADR 0007).

See plan 002 §T4 and spec 002 § "Permissions".

## Acceptance

- [ ] Declared rules are applied before dispatch, in the tested order alongside `agent`/`model`.
- [ ] A job with **no** `permissions` leaves the session rules untouched — no implicit tightening.
- [ ] An `"ask"` in a scheduled context is reported as a deny in the run record and the
      `running` log line, never left to time out.
- [ ] A host without `ctx.permission.rules` degrades to session defaults and logs once.
- [ ] README documents last-match-wins ordering with a correct and an incorrect example, and
      names `external_directory` as the quiet default that fails.
- [ ] An invalid permission shape refuses the job with a named reason.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
