---
type: bug
status: in_progress
id: bug-log-lines-before-first-lease-never-reach-the-file
title: "The first diagnostic lines never reach scheduler.log, because only acquireLease creates the log directory"
assignee: arggon
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-02"
updated: "2026-10-03"
claimed_at: "2026-10-03T00:23:23.963Z"
depends_on: [bug-storageless-degradation-unrecorded]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-log-lines-before-first-lease-never-reach-the-file.md
  Leaves live only under a story. id is the filename stem: bug-log-lines-before-first-lease-never-reach-the-file.
  CLI `arggon create bug log-lines-before-first-lease-never-reach-the-file` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# The first diagnostic lines never reach scheduler.log, because only acquireLease creates the log directory

## Context

Found by `task-audit-spec-001-acceptance-boxes`: **spec 001 box 151 is false.** The audit's verdict is
recorded on the box in the spec.

The box requires every fire/skip/error to reach **both** `stderr` **and**
`~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log`, and justifies the file sink by
noting plugin `console.error` is not captured into OpenCode's own log.

The dual sink works — pinned by tests that read `scheduler.log` back — **for every line emitted after
the first lease**. But the log directory is created by `acquireLease`, which only runs when there is
work to arm. So **every line emitted before it never reaches the file.**

**Reproduction:** fresh process, one enabled job, `ctx.storage.scan` absent. `stderr` receives
`ctx.storage.scan is unavailable, …` and then `could not append to …/scheduler.log`;
`scheduler.log` does not exist. Same for an idle project: the line explaining *why* the plugin is
inert — `no enabled jobs in .opencode/schedules.json or .opencode/tasks …; no timer armed` — is
stderr-only.

That is the wrong way round. The lines lost are exactly the **startup and degradation diagnostics**,
which are the ones you need when nothing is working and there is nothing in the file to read. A
project that never arms a timer leaves no evidence it was ever loaded.

Secondary, noted by the audit: the box says every line includes the job id, and the degradation
notices (missing `scan`, no YAML reader, lease unavailable, loop-scan cap) name no job — correctly,
since they are not about one. Fold that clarification into the box wording when you touch it.

## Acceptance

- [ ] The log directory is created independently of `acquireLease`, so **any** line can reach
      `scheduler.log` — including the inert-project notice and every degradation notice.
- [ ] A test starts from a directory with no log dir and asserts a startup line is in the file, not
      just on stderr. Cover the idle-project case, since that is the one that currently leaves no
      evidence at all.
- [ ] Failure to create the directory is itself reported once, clearly, and does not recurse.
- [ ] The "every line includes the job id" clause is amended to say job-scoped lines carry the id
      and host-level notices do not.

## Notes

Filed by the coordinator from the spec 001 audit. p2 because it costs observability rather than
correctness — but it is the kind of gap that makes the *next* outage take twice as long to diagnose,
which is exactly what the file sink was added to prevent.
