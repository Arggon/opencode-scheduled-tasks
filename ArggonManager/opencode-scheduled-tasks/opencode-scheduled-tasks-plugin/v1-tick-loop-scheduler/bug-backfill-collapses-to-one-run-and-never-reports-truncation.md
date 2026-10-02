---
type: bug
status: done
id: bug-backfill-collapses-to-one-run-and-never-reports-truncation
title: misfire backfill collapses every missed occurrence into one run and reports truncation nowhere
assignee: arggon
branch: fix/bug-backfill-collapses-to-one-run-and-never-reports-truncation
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-backfill-collapses-to-one-run-and-never-reports-truncation.md
  Leaves live only under a story. id is the filename stem: bug-backfill-collapses-to-one-run-and-never-reports-truncation.
  CLI `arggon create bug backfill-collapses-to-one-run-and-never-reports-truncation` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# misfire backfill collapses every missed occurrence into one run and reports truncation nowhere

## Context

Found by `task-audit-spec-001-acceptance-boxes`: **spec 001 box 120 is false.** The audit's verdict is
recorded on the box in the spec, with the reproduction.

`misfire: "backfill"` neither replays what the box says nor reports what it dropped.

- `resolveDue` folds up to `maxCatchUp` occurrences into **one** decision
  (`occurrence.collapsed = N`, `dueAt` = the oldest), and `tick` dispatches it **once**. The box says
  "replays at most `maxCatchUp` occurrences, oldest first".
- `occurrence.dropped` / `droppedCapped` are read by **nothing at all**. The `backlog-truncated`
  suppression that would print them (src/index.ts:3451) is never returned, so the second clause —
  "reports the dropped remainder as truncated in the run record" — has no code behind it either.

**Reproduction:** a job with `misfire: "backfill"`, `maxCatchUp: 3`, and five missed hourly
occurrences produces **one** `session.prompt`, one history record
`{dueAt, startedAt, outcome, model, sessionID}` with no collapsed/dropped field, and no truncation
line in the log or the file.

ADR 0002 promises the remainder is "dropped and reported as truncated in the run record, **never
silently**". Today it is exactly that: silently. A user who slept through five hourly runs and set
backfill to catch up is told nothing about the four that were not replayed.

## Acceptance

- [x] `backfill` replays up to `maxCatchUp` occurrences oldest-first, **each dispatched**, or the
      spec and ADR 0002 are amended to state the collapse deliberately — with the reason.
- [x] Whatever is dropped is reported: a `backlog-truncated` line **and** a field in the run record
      carrying `dropped` / `droppedCapped`, so "never silently" is true of both sinks.
- [x] A test pins it end to end with an injected clock: five missed occurrences, `maxCatchUp: 3`,
      assert the number of dispatches **and** the reported remainder.
- [x] Decide whether `collapsed` should survive into the record. If a collapsed N is genuinely the
      desired behaviour, the record must say so rather than looking like a single occurrence.

## Notes

Filed by the coordinator from the spec 001 audit. Do not resolve this by amending the box away: the
box describes what ADR 0002 decided, and ADR 0002 is Accepted. Either the code catches up or the ADR
is reopened with a stated reason.
