---
type: task
status: todo
id: task-docs-packaging-and-dogfood
title: "Docs, packaging, and dogfood"
parent: v1-tick-loop-scheduler
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-plugin-entry-tools-and-failure-isolation]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-docs-packaging-and-dogfood.md
  Leaves live only under a story. id is the filename stem: task-docs-packaging-and-dogfood.
  CLI `arggon create task docs-packaging-and-dogfood` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Docs, packaging, and dogfood

## Context

T5 of `plan-001`. Depends on T4. See plan §T5 and spec 001 §"Synopsis".

## Acceptance

- [ ] `README.md` documents install, the job-file reference, both tools, the inherited-
      permissions threat model, and OS cron as the documented escape hatch for jobs that
      must fire while the server is down.
- [ ] `package.json` is publishable as an OpenCode plugin and ships the vendored
      single-file install path (zero `node_modules`).
- [ ] Dogfood: installed into this repo, a `* * * * *` job runs end to end against a real
      OpenCode server with the observed log lines captured.
- [ ] The README's documented commands are executed verbatim by the dogfood run.



## Notes

Grounded against ArggonManager's `opencode/plugins/arggon/index.ts` and the
V2 plugin guide; see exploration 001 §"Grounded facts".
