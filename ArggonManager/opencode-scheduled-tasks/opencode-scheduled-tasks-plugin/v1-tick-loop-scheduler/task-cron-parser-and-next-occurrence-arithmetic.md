---
type: task
status: in_progress
id: task-cron-parser-and-next-occurrence-arithmetic
title: Cron parser and next-occurrence arithmetic
assignee: arggon
branch: feat/task-cron-parser-and-next-occurrence-arithmetic
parent: v1-tick-loop-scheduler
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T12:46:55.711Z"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-cron-parser-and-next-occurrence-arithmetic.md
  Leaves live only under a story. id is the filename stem: task-cron-parser-and-next-occurrence-arithmetic.
  CLI `arggon create task cron-parser-and-next-occurrence-arithmetic` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Cron parser and next-occurrence arithmetic

## Context

T1 of `plan-001`. Pure module, no OpenCode dependency: the 5-field cron parser and the
next-occurrence arithmetic everything else depends on. See
`ArggonManager/docs/plans/plan-opencode-scheduled-tasks-001.md` §T1 and spec 001
§"Loading and validation" / §"Time".

## Acceptance

- [ ] Parses 5-field cron (minute hour day-of-month month day-of-week) with `*`, lists,
      ranges and steps.
- [ ] Expands `@hourly`, `@daily`, `@weekly` (Sun 00:00), `@monthly` (1st 00:00); any other
      `@` token is rejected.
- [ ] Rejects malformed expressions, out-of-range fields, and impossible schedules
      (`0 0 30 2 *`) with a named reason.
- [ ] Computes the next occurrence strictly after an instant, in a named IANA timezone.
- [ ] Table-driven test pins each field position, month rollover and leap day, under UTC
      and a DST-observing zone.
- [ ] DST spring-forward skips the nonexistent local time; fall-back yields one first
      occurrence.



## Notes

Grounded against ArggonManager's `opencode/plugins/arggon/index.ts` and the
V2 plugin guide; see exploration 001 §"Grounded facts".
