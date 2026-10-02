---
type: story
status: done
id: ephemeral-tasks-one-offs-and-session-loops
title: "Ephemeral tasks: one-offs and session loops"
parent: v2-features-inspired-by-opencode-tasks
labels: []
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/ephemeral-tasks-one-offs-and-session-loops.md (story index; required).
  parent MUST be the epic id. Optional style prefixes (e.g. story-) are not type discriminators.
-->

# Ephemeral tasks: one-offs and session loops

## Context

Recurring jobs are the reviewed artifact; most scheduled work is not recurring. This story added
the two runtime-only shapes so the job file does not accumulate dead one-off history — settled by
[ADR 0006](../../../docs/adr/0006-ephemeral-runtime-tasks.md), which amends ADR 0001 on exactly
one point. **`schedules_schedule` / `schedules_cancel`** schedule a single prompt for an instant
(`dueAt`, or `dueIn: "2h"`) with a fresh session and the same permission discipline as a
scheduled job; a time slightly in the past still runs on the next tick, anything older is refused.
**`schedules_start_loop` / `schedules_stop_loop`** post a prompt into *the session that created
it* on a fixed interval — for in-session automation like polling a deploy — with a duration
interval (sub-minute refused), a three-day default expiry, a ten-loop per-session cap and no way
to post into or stop a loop from another session. Neither ever writes a job file: promoting one to
recurring is an explicit edit a reviewer can see.

## Acceptance

- [x] One-offs: absolute `dueAt` and relative `dueIn`; own storage namespace; never written to a
      job file; pending ones reported by `schedules_list`; `schedules_cancel` removes one by id
      and names an unknown id in its typed error (`task-t5`).
- [x] Loops: duration interval with sub-minute refused; posts only into its own session; refuses
      to start without a calling session rather than guessing; re-armed *before* it posts so a
      crash cannot double-post (`task-t6`).
- [x] Both are bounded and reported, not silently enforced: 50 pending one-offs per project, 10
      loops per session, three-day loop expiry that auto-disables and says so.
- [ ] Three defects surfaced by the lead-architect review of T3–T6 are open against this work and
      are **not** closed by this story: `bug-ephemeral-work-never-arms-tick`,
      `bug-loop-stop-does-not-persist-and-concurrency-bypass`,
      `bug-oneoff-history-unreadable-and-storage-unbounded`.

## Notes

This is a record written after the fact, not a re-opening: `status` stays `done`, as the tracker
forbids reopening. The three bugs are separate items and must be triaged on their own — the story
closing does not close them. Recorded by
`task-chore-ci-and-doc-statuses-for-plugin-and-v2`.
