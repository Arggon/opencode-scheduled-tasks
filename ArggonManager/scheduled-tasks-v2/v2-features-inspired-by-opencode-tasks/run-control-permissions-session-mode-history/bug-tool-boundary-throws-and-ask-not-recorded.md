---
type: bug
status: in_progress
id: bug-tool-boundary-throws-and-ask-not-recorded
title: "schedules_run throws out of the tool, and the ask-report misses the run record"
assignee: arggon
parent: run-control-permissions-session-mode-history
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T20:18:39.749Z"
depends_on: [bug-oneoff-history-unreadable-and-storage-unbounded]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/bug-tool-boundary-throws-and-ask-not-recorded.md
  Leaves live only under a story. id is the filename stem: bug-tool-boundary-throws-and-ask-not-recorded.
  CLI `arggon create bug tool-boundary-throws-and-ask-not-recorded` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# schedules_run throws out of the tool, and the ask-report misses the run record

## Context

Review findings M2 + B5 against `6344ce4` / `0f2eeab`, verdict **changes requested**.

**M2 — `schedules_run` can throw out of the tool.** `applyJobTarget` was awaited **outside** the try
block (src/index.ts:2484 vs 2485). Reproduced: `permission.rules` rejects → `THREW out of the
tool`, with **zero log lines**. This breaks invariant 3 (never breaks a session) and is inconsistent
with every other tool, which catches and reports.

**B5 — T4's ticked acceptance box is not what ships.** The box says an unattended `"ask"` is
"reported as a deny in the run record **and** the `running` log line". It is only a separate log
line (src/index.ts:1966-1968): `HistoryEntry` (653-663) has no field for it and `runJob`'s record
(2029-2039) keeps no trace. Either the code records it or the box and spec 002 are amended — the box
is currently ticked and untrue, which is exactly what the done gate exists to prevent. **A ticked
box that does not describe the code must not stay ticked**, whichever way it is resolved.

## Acceptance

- [ ] `schedules_run` cannot throw out of the tool: every failure is caught, reported in the tool
      output, and logged.
- [ ] Either the run record and history carry the ask-as-deny report, or the T4 box and spec 002 are
      amended to match the code — with the reason stated.
- [ ] Tests cover a rejecting `permission.rules` and assert no throw escapes the tool.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review. A ticked box that does not describe
the code must not stay ticked.
