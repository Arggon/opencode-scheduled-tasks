---
type: task
status: todo
id: task-plugin-entry-tools-and-failure-isolation
title: "Plugin entry, tools, and failure isolation"
parent: v1-tick-loop-scheduler
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-cron-parser-and-next-occurrence-arithmetic, task-misfire-resolution-and-run-state-machine, task-cross-process-writer-lease]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-plugin-entry-tools-and-failure-isolation.md
  Leaves live only under a story. id is the filename stem: task-plugin-entry-tools-and-failure-isolation.
  CLI `arggon create task plugin-entry-tools-and-failure-isolation` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Plugin entry, tools, and failure isolation

## Context

T4 of `plan-001` — the integration task. Depends on the three pure modules. Follows the
proven ArggonManager plugin contract: single dependency-free file, structural context types,
plain default-export definition object, and **no** `@opencode/plugin` import (that static
import breaks auto-discovery on 2.0.7/2.0.8/2.0.10/2.0.12). See plan §T4.

## Acceptance

- [ ] Single file, Node builtins only; no `@opencode/plugin` import; plain default-export
      definition object.
- [ ] Every `ctx` API is feature-detected; no path can throw through the plugin.
- [ ] Loads and validates `.opencode/schedules.json`; malformed JSON retains
      last-known-good and surfaces the error via `schedules_list`.
- [ ] Registers `schedules_list` (pure read) and `schedules_run` (ad-hoc trigger) via
      `ctx.tool.transform`; neither mutates the job set.
- [ ] Arms the `unref()`ed tick loop only when the lease is held and >=1 job is enabled.
- [ ] Cleanup clears the interval, releases the lease and disposes the tool registration,
      and is safe to call twice.
- [ ] A context missing `ctx.storage` degrades to in-memory state; the loss of cross-restart
      continuity is recorded in the run record.
- [ ] Each run is bounded by `runTimeoutMs`; on expiry the session is interrupted and
      `timeout` recorded.
- [ ] Every fire/skip/error logs one bounded `scheduled-tasks:` line including the job id;
      a repeated identical failure logs once.
- [ ] Fake-context tests cover setup, both tools, cleanup-twice, missing `ctx.storage`,
      malformed job file, and a throwing run.



## Notes

Grounded against ArggonManager's `opencode/plugins/arggon/index.ts` and the
V2 plugin guide; see exploration 001 §"Grounded facts".
